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

export interface SubtitleSyncProviderOptions {
  enabled?: boolean;
  /** Personalized Stremio subtitle addon manifest URL (e.g. https://subtitlesync.stream/<token>/manifest.json). */
  manifestUrl?: string;
  timeoutMs?: number;
  downloadCacheTtlMs?: number;
  maxCachedDownloads?: number;
  maxSubtitleBytes?: number;
  fetchFn?: typeof fetch;
  nowProvider?: () => number;
}

interface ExternalAddonSubEntry {
  id?: string | number;
  url?: string;
  lang?: string;
  label?: string;
  subtitleFileName?: string;
  movieReleaseName?: string;
}

const BCP47_TO_STREMIO_LANGS: Record<string, readonly string[]> = {
  en: ['eng', 'en', 'english'],
  'pt-br': ['pob', 'pb', 'pt-br', 'pt_br', 'por', 'pt', 'portuguese (brazil)', 'portuguese'],
  es: ['spa', 'spn', 'es', 'es-la', 'spanish'],
  fr: ['fre', 'fra', 'fr', 'french'],
  de: ['ger', 'deu', 'de', 'german'],
  it: ['ita', 'it', 'italian'],
  ja: ['jpn', 'ja', 'japanese'],
};

function normalizeAddonBaseUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim().replace(/^stremio:\/\//i, 'https://');
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
      return null;
    }
    const cleanPath = parsed.pathname.replace(/\/manifest\.json$/i, '').replace(/\/+$/, '');
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return null;
  }
}

function detectSubtitleFormat(content: string, url?: string): SubtitleFormat {
  if (/^\uFEFF?WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(content.trimStart())) {
    return 'vtt';
  }
  if (url && /\.vtt(?:$|\?)/i.test(url)) {
    return 'vtt';
  }
  return 'srt';
}

function formatStremioIdForPath(canonicalId: string): string {
  return canonicalId
    .split(':')
    .map((part) => encodeURIComponent(part))
    .join(':');
}

/**
 * Integrates with **Subtitle Sync** (`https://subtitlesync.stream/.../manifest.json`) or any
 * compatible Stremio subtitle addon URL configured by the user.
 *
 * Security:
 * - Never logs or echoes the user's personalized manifest URL (which may embed tokens).
 * - Accepts only `https://` remote URLs (or local loopback for testing).
 */
export class SubtitleSyncAddonProvider implements SubtitleDiscoveryProvider {
  public readonly name = 'subtitle-sync-addon';
  public readonly origin = 'external' as const;

  private enabled: boolean;
  private addonBaseUrl: string | null;
  private readonly timeoutMs: number;
  private readonly downloadCacheTtlMs: number;
  private readonly maxCachedDownloads: number;
  private readonly maxSubtitleBytes: number;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly cache = new Map<string, { asset: RawSubtitleAsset; expiresAt: number }>();

  public constructor(options: SubtitleSyncProviderOptions = {}) {
    this.enabled = options.enabled === true;
    this.addonBaseUrl = options.manifestUrl ? normalizeAddonBaseUrl(options.manifestUrl) : null;
    this.timeoutMs = options.timeoutMs ?? 12_000;
    this.downloadCacheTtlMs = options.downloadCacheTtlMs ?? 15 * 60 * 1000;
    this.maxCachedDownloads = options.maxCachedDownloads ?? 100;
    this.maxSubtitleBytes = options.maxSubtitleBytes ?? MAX_SOURCE_SUBTITLE_BYTES;
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.nowProvider ?? (() => Date.now());
  }

  public isEnabled(): boolean {
    return this.enabled && this.addonBaseUrl !== null;
  }

  public hasConfiguredUrl(): boolean {
    return this.addonBaseUrl !== null;
  }

  public configure(update: { enabled?: boolean; manifestUrl?: string }): { validUrl: boolean } {
    if (typeof update.manifestUrl === 'string') {
      if (update.manifestUrl.trim() === '') {
        this.addonBaseUrl = null;
      } else {
        const normalized = normalizeAddonBaseUrl(update.manifestUrl);
        if (!normalized) {
          return { validUrl: false };
        }
        this.addonBaseUrl = normalized;
      }
    }
    if (typeof update.enabled === 'boolean') {
      this.enabled = update.enabled;
    }
    return { validUrl: true };
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

  private async queryEndpoint(url: string): Promise<ExternalAddonSubEntry[]> {
    try {
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) return [];
      const json = (await res.json()) as { subtitles?: unknown };
      if (!Array.isArray(json.subtitles)) return [];
      return json.subtitles.filter((item): item is ExternalAddonSubEntry => Boolean(item && typeof item === 'object'));
    } catch {
      return [];
    }
  }

  public async discover(
    identity: StremioContentIdentity,
    language: string,
  ): Promise<readonly SubtitleDiscoveryCandidate[]> {
    if (!this.isEnabled() || !this.addonBaseUrl) {
      return [];
    }

    const langDesc = findLanguageDescriptor(language);
    const acceptedCodes = BCP47_TO_STREMIO_LANGS[language.trim().toLowerCase()];
    if (!langDesc || !acceptedCodes) {
      return [];
    }

    const pathId = formatStremioIdForPath(identity.canonicalId);
    const extraParts: string[] = [];
    if (identity.videoHash) extraParts.push(`videoHash=${encodeURIComponent(identity.videoHash)}`);
    if (identity.videoSize !== undefined) extraParts.push(`videoSize=${String(identity.videoSize)}`);
    if (identity.filename) extraParts.push(`filename=${encodeURIComponent(identity.filename)}`);

    const urlsToTry: Array<{ url: string; hashMatched: boolean }> = [];
    if (extraParts.length > 0) {
      urlsToTry.push({
        url: `${this.addonBaseUrl}/subtitles/${identity.mediaType}/${pathId}/${extraParts.join('&')}.json`,
        hashMatched: true,
      });
    }
    urlsToTry.push({
      url: `${this.addonBaseUrl}/subtitles/${identity.mediaType}/${pathId}.json`,
      hashMatched: false,
    });

    for (const attempt of urlsToTry) {
      const entries = await this.queryEndpoint(attempt.url);
      const matched: Array<{ entry: ExternalAddonSubEntry; langRank: number; releaseScore: number }> = [];

      for (const entry of entries) {
        if (typeof entry.url !== 'string' || !/^https?:\/\//i.test(entry.url)) continue;
        const rawLang = (entry.lang ?? '').trim().toLowerCase();
        const langRank = acceptedCodes.indexOf(rawLang);
        if (langRank === -1) continue;

        const releaseHint = entry.movieReleaseName ?? entry.subtitleFileName ?? entry.label;
        const releaseScore = computeReleaseSimilarity(identity.filename, releaseHint);
        matched.push({ entry, langRank, releaseScore });
      }

      if (matched.length > 0) {
        matched.sort((a, b) => a.langRank - b.langRank || b.releaseScore - a.releaseScore);
        return matched.slice(0, 5).map(({ entry, releaseScore }, idx) => {
          const subId = String(entry.id ?? idx);
          const downloadUrl = entry.url as string;
          return {
            candidateId: `subsync:${subId}`,
            providerName: this.name,
            origin: 'external',
            language: langDesc.bcp47,
            format: 'srt',
            contentId: identity.canonicalId,
            mediaType: identity.mediaType,
            ...(identity.season !== undefined ? { season: identity.season } : {}),
            ...(identity.episode !== undefined ? { episode: identity.episode } : {}),
            confidence: 'exact',
            matchReason: 'Pre-synchronized track from Subtitle Sync addon.',
            metadata: {
              ...(entry.subtitleFileName ? { filename: entry.subtitleFileName } : {}),
              ...(entry.movieReleaseName ? { releaseName: entry.movieReleaseName } : {}),
              releaseScore: releaseScore + 60, // Prioritize Subtitle Sync above unaligned raw providers
              moviehashMatch: attempt.hashMatched,
            },
            loadAsset: () => this.downloadTrack(subId, downloadUrl, langDesc.bcp47),
          };
        });
      }
    }

    return [];
  }

  private async downloadTrack(
    subId: string,
    url: string,
    normalizedLanguage: string,
  ): Promise<RawSubtitleAsset | null> {
    const key = `${normalizedLanguage}:${url}`;
    const cached = this.cache.get(key);
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
        sourceId: `subsync-${subId}`,
        language: normalizedLanguage,
        format: detectSubtitleFormat(content, url),
        content,
      };
      if (this.cache.size >= this.maxCachedDownloads) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined) this.cache.delete(oldest);
      }
      this.cache.set(key, { asset, expiresAt: this.now() + this.downloadCacheTtlMs });
      return asset;
    } catch {
      return null;
    }
  }
}
