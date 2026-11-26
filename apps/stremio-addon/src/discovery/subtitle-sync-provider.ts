import type { SubtitleFormat } from '@subtitleme/shared-types';
import { findLanguageDescriptor, getAcceptedStremioCodes } from '../config/addon-config';
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

function normalizeAddonBaseUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim().replace(/^stremio:\/\//i, 'https://');
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol !== 'https:' &&
      parsed.hostname !== '127.0.0.1' &&
      parsed.hostname !== 'localhost'
    ) {
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

function parseSubtitleSyncLabel(entry: ExternalAddonSubEntry): {
  isSynced: boolean;
  releaseHint: string | undefined;
} {
  const rawLabel = `${entry.label ?? ''} ${String(entry.id ?? '')}`.trim();
  const lower = rawLabel.toLowerCase();
  const isUnsynced =
    rawLabel.includes('⚠️') ||
    lower.includes('não sincronizada') ||
    lower.includes('nao sincronizada') ||
    lower.includes('unsynced') ||
    lower.includes('not synced');

  if (entry.movieReleaseName) {
    return { isSynced: !isUnsynced, releaseHint: entry.movieReleaseName };
  }
  if (entry.subtitleFileName) {
    return { isSynced: !isUnsynced, releaseHint: entry.subtitleFileName };
  }
  // Subtitle Sync formats labels like: "✅ Sincronizada · OpenSubtitles · Movie.1080p.WEB-DL-FLUX"
  const parts = (entry.label ?? String(entry.id ?? '')).split('·').map((s) => s.trim());
  const tail = parts[parts.length - 1]?.replace(/^…+/, '').trim();
  return {
    isSynced: !isUnsynced && rawLabel.length > 0,
    releaseHint: tail && tail.length > 0 ? tail : undefined,
  };
}

/**
 * Integrates with **Subtitle Sync** (`https://subtitlesync.stream/.../manifest.json`) or any
 * compatible Stremio subtitle addon URL configured by the user.
 */
export class SubtitleSyncAddonProvider implements SubtitleDiscoveryProvider {
  public readonly name = 'subtitle-sync-addon';
  public readonly origin = 'external' as const;

  private enabled: boolean;
  private addonBaseUrl: string | null;
  private rawManifestUrl: string | null;
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
    this.rawManifestUrl = this.addonBaseUrl ? `${this.addonBaseUrl}/manifest.json` : null;
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

  /** Internal helper for private local persistence only — never exposed in HTTP responses. */
  public getManifestUrlForPersistence(): string | null {
    return this.rawManifestUrl;
  }

  public configure(update: { enabled?: boolean; manifestUrl?: string }): { validUrl: boolean } {
    if (typeof update.manifestUrl === 'string') {
      if (update.manifestUrl.trim() === '') {
        this.addonBaseUrl = null;
        this.rawManifestUrl = null;
      } else {
        const normalized = normalizeAddonBaseUrl(update.manifestUrl);
        if (!normalized) {
          return { validUrl: false };
        }
        this.addonBaseUrl = normalized;
        this.rawManifestUrl = `${normalized}/manifest.json`;
      }
    }
    if (typeof update.enabled === 'boolean') {
      this.enabled = update.enabled;
    }
    return { validUrl: true };
  }

  public async probeManifest(): Promise<{ ok: boolean; addonName?: string; version?: string }> {
    if (!this.addonBaseUrl) return { ok: false };
    try {
      const res = await this.fetchWithTimeout(`${this.addonBaseUrl}/manifest.json`);
      if (!res.ok) return { ok: false };
      const json = (await res.json()) as { name?: unknown; version?: unknown };
      return {
        ok: true,
        ...(typeof json.name === 'string' ? { addonName: json.name } : {}),
        ...(typeof json.version === 'string' ? { version: json.version } : {}),
      };
    } catch {
      return { ok: false };
    }
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
      return json.subtitles.filter((item): item is ExternalAddonSubEntry =>
        Boolean(item && typeof item === 'object'),
      );
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
    if (!langDesc) {
      return [];
    }
    const acceptedCodes = [
      ...getAcceptedStremioCodes(langDesc),
      langDesc.label.toLowerCase(),
    ];

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
      const matched: Array<{
        entry: ExternalAddonSubEntry;
        langRank: number;
        releaseScore: number;
        isSynced: boolean;
        releaseHint: string | undefined;
      }> = [];

      for (const entry of entries) {
        if (typeof entry.url !== 'string' || !/^https?:\/\//i.test(entry.url)) continue;
        const rawLang = (entry.lang ?? '').trim().toLowerCase();
        const langRank = acceptedCodes.indexOf(rawLang);
        if (langRank === -1) continue;

        const { isSynced, releaseHint } = parseSubtitleSyncLabel(entry);
        // Skip Subtitle Sync's unsynced/warning entries ("⚠️ Não sincronizada") which inject a 60s
        // diagnostic banner; clean OpenSubtitles v3/v1 + our Auto-Sync engine handle fallback cleanly!
        if (!isSynced) continue;

        const releaseScore = computeReleaseSimilarity(identity.filename, releaseHint);
        matched.push({ entry, langRank, releaseScore, isSynced, releaseHint });
      }

      if (matched.length > 0) {
        matched.sort(
          (a, b) =>
            Number(b.isSynced) - Number(a.isSynced) ||
            a.langRank - b.langRank ||
            b.releaseScore - a.releaseScore,
        );
        return matched.slice(0, 6).map(({ entry, releaseScore, isSynced, releaseHint }, idx) => {
          const subId = String(entry.id ?? idx).slice(0, 64);
          const downloadUrl = entry.url as string;
          return {
            candidateId: `subsync:${idx}`,
            providerName: this.name,
            origin: 'external',
            language: langDesc.bcp47,
            format: 'srt',
            contentId: identity.canonicalId,
            mediaType: identity.mediaType,
            ...(identity.season !== undefined ? { season: identity.season } : {}),
            ...(identity.episode !== undefined ? { episode: identity.episode } : {}),
            confidence: isSynced ? 'exact' : 'high',
            matchReason: isSynced
              ? 'Frame-synchronized track from Subtitle Sync addon.'
              : 'Release candidate from Subtitle Sync addon.',
            metadata: {
              ...(entry.subtitleFileName ? { filename: entry.subtitleFileName } : {}),
              ...(releaseHint ? { releaseName: releaseHint } : {}),
              releaseScore,
              moviehashMatch: attempt.hashMatched && isSynced,
              syncedByAddon: isSynced,
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
      const rawContent = await res.text();
      if (!rawContent.trim() || Buffer.byteLength(rawContent, 'utf-8') > this.maxSubtitleBytes) {
        return null;
      }
      // Reject diagnostic-only payloads from Subtitle Sync when stream metadata was missing
      if (rawContent.includes('subtitlesync.stream/discord') && rawContent.length < 1500) {
        return null;
      }
      const content = rawContent;
      const asset: RawSubtitleAsset = {
        sourceId: `subsync-${Buffer.from(subId).toString('hex').slice(0, 24)}`,
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
