import type { SubtitleFormat } from '@subtitleme/shared-types';
import { findLanguageDescriptor } from '../config/addon-config';
import { MAX_SOURCE_SUBTITLE_BYTES } from '../delivery/subtitle-file-service';
import type { RawSubtitleAsset } from '../sources/subtitle-source.interface';
import type { StremioContentIdentity } from './content-identifier';
import type {
  SubtitleDiscoveryCandidate,
  SubtitleDiscoveryProvider,
} from './discovery-types';
import { computeReleaseSimilarity } from './release-similarity';

export const STREMIO_OPENSUBTITLES_V3_BASE_URL = 'https://opensubtitles-v3.strem.io';

export interface StremioOpenSubtitlesV3Options {
  /** Strictly opt-in. Defaults to `false`. */
  enabled?: boolean;
  baseUrl?: string;
  timeoutMs?: number;
  downloadCacheTtlMs?: number;
  maxCachedDownloads?: number;
  maxSubtitleBytes?: number;
  fetchFn?: typeof fetch;
  nowProvider?: () => number;
}

interface StremioV3SubtitleEntry {
  id?: string | number;
  url?: string;
  lang?: string;
  subtitleFileName?: string;
  movieReleaseName?: string;
}

const BCP47_TO_V3_LANGS: Record<string, readonly string[]> = {
  en: ['eng', 'en'],
  'pt-br': ['pob', 'pb', 'pt-br', 'por', 'pt'],
  es: ['spa', 'spn', 'es'],
  fr: ['fre', 'fra', 'fr'],
  de: ['ger', 'deu', 'de'],
  it: ['ita', 'it'],
  ja: ['jpn', 'ja'],
};

function detectFormat(content: string, urlOrName?: string): SubtitleFormat {
  if (/^\uFEFF?WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(content.trimStart())) {
    return 'vtt';
  }
  if (urlOrName && /\.vtt(?:$|\?)/i.test(urlOrName)) {
    return 'vtt';
  }
  return 'srt';
}

/**
 * Opt-in Stremio OpenSubtitles v3 Addon Discovery Provider (`https://opensubtitles-v3.strem.io`).
 * Fetches public UTF-8 subtitle tracks for IMDb movies/episodes without requiring an API key,
 * enabling immediate DualSubs-style dual-language merging in Stremio Desktop.
 */
export class StremioOpenSubtitlesV3Provider implements SubtitleDiscoveryProvider {
  public readonly name = 'stremio-opensubtitles-v3';
  public readonly origin = 'external' as const;

  private enabled: boolean;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly downloadCacheTtlMs: number;
  private readonly maxCachedDownloads: number;
  private readonly maxSubtitleBytes: number;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly cache = new Map<string, { asset: RawSubtitleAsset; expiresAt: number }>();

  public constructor(options: StremioOpenSubtitlesV3Options = {}) {
    this.enabled = options.enabled === true;
    this.baseUrl = (options.baseUrl ?? STREMIO_OPENSUBTITLES_V3_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.downloadCacheTtlMs = options.downloadCacheTtlMs ?? 15 * 60 * 1000;
    this.maxCachedDownloads = options.maxCachedDownloads ?? 100;
    this.maxSubtitleBytes = options.maxSubtitleBytes ?? MAX_SOURCE_SUBTITLE_BYTES;
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.nowProvider ?? (() => Date.now());
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchFn(url, { method: 'GET', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  public async discover(
    identity: StremioContentIdentity,
    language: string,
  ): Promise<readonly SubtitleDiscoveryCandidate[]> {
    if (!this.enabled || !identity.imdbId) {
      return [];
    }

    const langDesc = findLanguageDescriptor(language);
    const acceptedCodes = BCP47_TO_V3_LANGS[language.trim().toLowerCase()];
    if (!langDesc || !acceptedCodes) {
      return [];
    }

    // Preserve literal ':' in series episode IDs (e.g. tt0903747:1:2) as expected by opensubtitles-v3.strem.io
    const pathId = identity.canonicalId
      .split(':')
      .map((seg) => encodeURIComponent(seg))
      .join(':');

    const extraParts: string[] = [];
    if (identity.videoHash) extraParts.push(`videoHash=${encodeURIComponent(identity.videoHash)}`);
    if (identity.videoSize !== undefined) extraParts.push(`videoSize=${String(identity.videoSize)}`);

    const queries: Array<{ url: string; hashQuery: boolean }> = [];
    if (extraParts.length > 0) {
      queries.push({
        url: `${this.baseUrl}/subtitles/${identity.mediaType}/${pathId}/${extraParts.join('&')}.json`,
        hashQuery: true,
      });
    }
    // Always fall back to plain IMDb endpoint when hash-specific query has no match for this language
    queries.push({
      url: `${this.baseUrl}/subtitles/${identity.mediaType}/${pathId}.json`,
      hashQuery: false,
    });

    const collected = new Map<string, SubtitleDiscoveryCandidate>();

    for (const q of queries) {
      try {
        const res = await this.fetchWithTimeout(q.url);
        if (!res.ok) continue;
        const json = (await res.json()) as { subtitles?: unknown };
        if (!Array.isArray(json.subtitles)) continue;

        const matchedEntries: Array<{
          entry: StremioV3SubtitleEntry;
          rank: number;
          releaseScore: number;
          isHash: boolean;
        }> = [];

        for (const raw of json.subtitles) {
          if (!raw || typeof raw !== 'object') continue;
          const entry = raw as StremioV3SubtitleEntry & { m?: string };
          if (typeof entry.url !== 'string' || !/^https:\/\//i.test(entry.url)) continue;
          const entryLang = (entry.lang ?? '').trim().toLowerCase();
          const rank = acceptedCodes.indexOf(entryLang);
          if (rank === -1) continue;

          // In opensubtitles-v3.strem.io, m === 'h' denotes exact OpenSubtitles moviehash match
          const isHash = q.hashQuery && (entry.m === 'h' || entry.m === undefined);
          const releaseScore = computeReleaseSimilarity(
            identity.filename,
            entry.movieReleaseName ?? entry.subtitleFileName,
          );
          matchedEntries.push({ entry, rank, releaseScore, isHash });
        }

        matchedEntries.sort(
          (a, b) =>
            Number(b.isHash) - Number(a.isHash) ||
            a.rank - b.rank ||
            b.releaseScore - a.releaseScore,
        );

        for (const [idx, { entry, releaseScore, isHash }] of matchedEntries.slice(0, 6).entries()) {
          const subId = String(entry.id ?? idx);
          if (collected.has(subId)) continue;
          const downloadUrl = entry.url as string;
          collected.set(subId, {
            candidateId: `osv3:${subId}`,
            providerName: this.name,
            origin: 'external',
            language: langDesc.bcp47,
            format: 'srt',
            contentId: identity.canonicalId,
            mediaType: identity.mediaType,
            ...(identity.season !== undefined ? { season: identity.season } : {}),
            ...(identity.episode !== undefined ? { episode: identity.episode } : {}),
            confidence: isHash ? 'exact' : 'high',
            matchReason: isHash
              ? `Exact moviehash match on OpenSubtitles v3 (${entry.lang ?? langDesc.bcp47}).`
              : `Stremio OpenSubtitles v3 match (${entry.lang ?? langDesc.bcp47}).`,
            metadata: {
              ...(entry.subtitleFileName ? { filename: entry.subtitleFileName } : {}),
              ...(entry.movieReleaseName ? { releaseName: entry.movieReleaseName } : {}),
              releaseScore,
              moviehashMatch: isHash,
            },
            loadAsset: () =>
              this.downloadSubtitle(subId, downloadUrl, langDesc.bcp47, entry.subtitleFileName),
          });
        }

        if (collected.size > 0) {
          break;
        }
      } catch {
        // Try fallback query
      }
    }

    return Array.from(collected.values());
  }

  private async downloadSubtitle(
    subId: string,
    url: string,
    normalizedLanguage: string,
    fileName?: string,
  ): Promise<RawSubtitleAsset | null> {
    const cacheKey = `${normalizedLanguage}:${url}`;
    const cached = this.cache.get(cacheKey);
    if (cached && this.now() < cached.expiresAt) {
      return cached.asset;
    }

    try {
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) return null;
      const content = await res.text();
      if (!content.trim() || Buffer.byteLength(content, 'utf-8') > this.maxSubtitleBytes) {
        return null;
      }
      const asset: RawSubtitleAsset = {
        sourceId: `osv3-${subId}`,
        language: normalizedLanguage,
        format: detectFormat(content, fileName ?? url),
        content,
      };
      if (this.cache.size >= this.maxCachedDownloads) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, { asset, expiresAt: this.now() + this.downloadCacheTtlMs });
      return asset;
    } catch {
      return null;
    }
  }
}
