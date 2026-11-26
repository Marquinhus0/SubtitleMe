import type { SubtitleFormat } from '@subtitleme/shared-types';
import { findLanguageDescriptor } from '../config/addon-config';
import { MAX_SOURCE_SUBTITLE_BYTES } from '../delivery/subtitle-file-service';
import type { RawSubtitleAsset } from '../sources/subtitle-source.interface';
import {
  OPENSUBTITLES_DEFAULT_BASE_URL,
  OPENSUBTITLES_DEFAULT_TIMEOUT_MS,
  type OpenSubtitlesErrorCode,
  type OpenSubtitlesFetchDiagnostics,
} from '../sources/opensubtitles-source';
import type { StremioContentIdentity } from './content-identifier';
import type {
  SubtitleDiscoveryCandidate,
  SubtitleDiscoveryProvider,
} from './discovery-types';
import { computeReleaseSimilarity } from './release-similarity';

export interface OpenSubtitlesDiscoveryOptions {
  /** Strictly opt-in. Defaults to `false`. */
  enabled?: boolean;
  /** User-supplied OpenSubtitles REST API v1 key. Never logged or cached in metadata. */
  apiKey?: string;
  /** Optional bearer token from official `/login` endpoint. */
  bearerToken?: string;
  userAgent?: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Maximum retry attempts on transient 5xx responses (defaults to 1; never retries 401/403/429). */
  maxRetries?: number;
  retryDelayMs?: number;
  /** Bounded in-memory download cache TTL (default 15 minutes) to conserve API quota. */
  downloadCacheTtlMs?: number;
  maxCachedDownloads?: number;
  maxSubtitleBytes?: number;
  fetchFn?: typeof fetch;
  nowProvider?: () => number;
}

interface CachedExternalAsset {
  asset: RawSubtitleAsset;
  expiresAt: number;
}

function mapBcp47ToOpenSubtitlesLang(bcp47: string): string | null {
  const desc = findLanguageDescriptor(bcp47);
  if (!desc) return null;
  return desc.openSubtitlesV1Code ?? desc.bcp47.toLowerCase();
}

function detectSubtitleFormat(content: string, fileName?: string): SubtitleFormat {
  if (/^\uFEFF?WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(content.trimStart())) {
    return 'vtt';
  }
  if (fileName && /\.vtt$/i.test(fileName)) {
    return 'vtt';
  }
  return 'srt';
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Official OpenSubtitles REST API v1 Discovery Provider (`GET /api/v1/subtitles`, `POST /api/v1/download`).
 *
 * Security & Compliance:
 * - Disabled by default (`enabled: false`); strictly opt-in.
 * - Never scrapes web pages, never invents endpoints, never uploads local files.
 * - Never logs or stores `apiKey` / `bearerToken` in candidates or cached assets.
 * - Controlled retry on transient `5xx` only (never retries `401`/`403` auth errors or `429` rate limits).
 * - Bounded in-memory download cache (`maxCachedDownloads`, `downloadCacheTtlMs`) to respect API quotas.
 */
export class OpenSubtitlesDiscoveryProvider implements SubtitleDiscoveryProvider {
  public readonly name = 'opensubtitles-rest-v1-discovery';
  public readonly origin = 'external' as const;

  private enabled: boolean;
  private apiKey: string;
  private bearerToken: string | undefined;
  private readonly userAgent: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly downloadCacheTtlMs: number;
  private readonly maxCachedDownloads: number;
  private readonly maxSubtitleBytes: number;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;

  private readonly downloadCache = new Map<number, CachedExternalAsset>();
  private diagnostics: OpenSubtitlesFetchDiagnostics = { lastStatus: 'DISABLED' };

  public constructor(options: OpenSubtitlesDiscoveryOptions = {}) {
    this.enabled = options.enabled === true;
    this.apiKey = (options.apiKey ?? '').trim();
    this.bearerToken = options.bearerToken?.trim() || undefined;
    this.userAgent = options.userAgent ?? 'SubtitleMe v1.0.0';
    this.baseUrl = (options.baseUrl ?? OPENSUBTITLES_DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? OPENSUBTITLES_DEFAULT_TIMEOUT_MS;
    this.maxRetries = Math.min(Math.max(options.maxRetries ?? 1, 0), 2);
    this.retryDelayMs = options.retryDelayMs ?? 150;
    this.downloadCacheTtlMs = options.downloadCacheTtlMs ?? 15 * 60 * 1000;
    this.maxCachedDownloads = options.maxCachedDownloads ?? 100;
    this.maxSubtitleBytes = options.maxSubtitleBytes ?? MAX_SOURCE_SUBTITLE_BYTES;
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.nowProvider ?? (() => Date.now());
  }

  public isEnabled(): boolean {
    return this.enabled && this.apiKey.length > 0;
  }

  public hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  /** Internal helper for private local persistence only — never exposed in HTTP responses. */
  public getApiKeyForPersistence(): string {
    return this.apiKey;
  }

  public async probeConnection(): Promise<{ ok: boolean; status: number | string }> {
    if (!this.apiKey) return { ok: false, status: 'MISSING_API_KEY' };
    try {
      const res = await this.fetchWithTimeoutAndRetry(
        `${this.baseUrl}/subtitles?imdb_id=0133093&languages=en`,
        { method: 'GET', headers: this.buildHeaders() },
      );
      return { ok: res.ok, status: res.status };
    } catch {
      return { ok: false, status: 'NETWORK_ERROR' };
    }
  }

  /**
   * Updates runtime opt-in OpenSubtitles REST API v1 configuration in-memory without logging secrets.
   */
  public configure(update: { enabled?: boolean; apiKey?: string; bearerToken?: string }): void {
    if (typeof update.apiKey === 'string') {
      this.apiKey = update.apiKey.trim();
    }
    if (update.bearerToken !== undefined) {
      this.bearerToken = update.bearerToken.trim() || undefined;
    }
    if (typeof update.enabled === 'boolean') {
      this.enabled = update.enabled;
    }
    if (!this.enabled) {
      this.setStatus('DISABLED');
    } else if (this.apiKey.length === 0) {
      this.setStatus('MISSING_API_KEY');
    }
  }

  public getDiagnostics(): OpenSubtitlesFetchDiagnostics {
    return this.diagnostics;
  }

  public clearDownloadCache(): void {
    this.downloadCache.clear();
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Api-Key': this.apiKey,
      'User-Agent': this.userAgent,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.bearerToken) {
      headers.Authorization = `Bearer ${this.bearerToken}`;
    }
    return headers;
  }

  private async fetchWithTimeoutAndRetry(url: string, init: RequestInit): Promise<Response> {
    let lastResponse: Response | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchFn(url, { ...init, signal: controller.signal });
        lastResponse = res;
        // Only retry on transient 5xx server errors; never retry 401/403/429/4xx
        if (res.status >= 500 && res.status <= 599 && attempt < this.maxRetries) {
          await sleep(this.retryDelayMs * (attempt + 1));
          continue;
        }
        return res;
      } finally {
        clearTimeout(timer);
      }
    }
    return lastResponse as Response;
  }

  private setStatus(code: 'ok' | OpenSubtitlesErrorCode, retryAfterSeconds?: number): void {
    this.diagnostics = {
      lastStatus: code,
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    };
  }

  private getCachedDownload(fileId: number): RawSubtitleAsset | null {
    const entry = this.downloadCache.get(fileId);
    if (!entry) return null;
    if (this.now() >= entry.expiresAt) {
      this.downloadCache.delete(fileId);
      return null;
    }
    return entry.asset;
  }

  private putCachedDownload(fileId: number, asset: RawSubtitleAsset): void {
    if (this.downloadCache.size >= this.maxCachedDownloads) {
      const oldestKey = this.downloadCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.downloadCache.delete(oldestKey);
      }
    }
    this.downloadCache.set(fileId, {
      asset,
      expiresAt: this.now() + this.downloadCacheTtlMs,
    });
  }

  public async discover(
    identity: StremioContentIdentity,
    language: string,
  ): Promise<readonly SubtitleDiscoveryCandidate[]> {
    if (!this.enabled) {
      this.setStatus('DISABLED');
      return [];
    }
    if (this.apiKey.length === 0) {
      this.setStatus('MISSING_API_KEY');
      return [];
    }
    // OpenSubtitles REST API v1 search requires a verified IMDb ID; never guess for non-IMDb IDs
    if (!identity.imdbId) {
      this.setStatus('INVALID_CONTENT_ID');
      return [];
    }

    const langDesc = findLanguageDescriptor(language);
    const osLang = mapBcp47ToOpenSubtitlesLang(language);
    if (!langDesc || !osLang) {
      this.setStatus('NOT_FOUND');
      return [];
    }

    const numericImdb = identity.imdbId.replace(/^tt/i, '');
    const params = new URLSearchParams();
    if (identity.season !== undefined && identity.episode !== undefined) {
      params.set('parent_imdb_id', numericImdb);
      params.set('season_number', String(identity.season));
      params.set('episode_number', String(identity.episode));
    } else {
      params.set('imdb_id', numericImdb);
    }
    params.set('languages', osLang);
    params.set('order_by', 'download_count');
    params.set('order_direction', 'desc');
    if (identity.videoHash) {
      params.set('moviehash', identity.videoHash);
    }

    try {
      const searchRes = await this.fetchWithTimeoutAndRetry(
        `${this.baseUrl}/subtitles?${params.toString()}`,
        { method: 'GET', headers: this.buildHeaders() },
      );

      if (searchRes.status === 401 || searchRes.status === 403) {
        this.setStatus('AUTH_ERROR');
        return [];
      }
      if (searchRes.status === 429) {
        const retryAfter = Number(searchRes.headers.get('retry-after') ?? 0);
        this.setStatus(
          'RATE_LIMITED',
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
        );
        return [];
      }
      if (!searchRes.ok) {
        this.setStatus('UPSTREAM_ERROR');
        return [];
      }

      let searchJson: unknown;
      try {
        searchJson = await searchRes.json();
      } catch {
        this.setStatus('MALFORMED_RESPONSE');
        return [];
      }

      const candidates = this.extractCandidates(searchJson, identity, langDesc.bcp47);
      if (candidates.length === 0) {
        this.setStatus('NOT_FOUND');
        return [];
      }

      this.setStatus('ok');
      return candidates;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        this.setStatus('TIMEOUT');
        return [];
      }
      this.setStatus('UPSTREAM_ERROR');
      return [];
    }
  }

  private extractCandidates(
    searchJson: unknown,
    identity: StremioContentIdentity,
    normalizedLanguage: string,
  ): SubtitleDiscoveryCandidate[] {
    if (!searchJson || typeof searchJson !== 'object' || !('data' in searchJson)) {
      return [];
    }
    const data = (searchJson as { data?: unknown }).data;
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const results: SubtitleDiscoveryCandidate[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const attrs = (item as { attributes?: unknown }).attributes;
      if (!attrs || typeof attrs !== 'object') continue;
      const files = (attrs as { files?: unknown }).files;
      if (!Array.isArray(files) || files.length === 0) continue;

      const firstFile = files[0];
      if (
        !firstFile ||
        typeof firstFile !== 'object' ||
        typeof (firstFile as { file_id?: unknown }).file_id !== 'number'
      ) {
        continue;
      }

      const fileId = (firstFile as { file_id: number }).file_id;
      const fileName =
        typeof (firstFile as { file_name?: unknown }).file_name === 'string'
          ? (firstFile as { file_name: string }).file_name
          : undefined;
      const releaseName =
        typeof (attrs as { release?: unknown }).release === 'string'
          ? (attrs as { release: string }).release
          : undefined;
      const downloadCount =
        typeof (attrs as { download_count?: unknown }).download_count === 'number'
          ? (attrs as { download_count: number }).download_count
          : undefined;

      // Verify feature details season/episode when present in OpenSubtitles response
      const featureDetails = (attrs as { feature_details?: unknown }).feature_details;
      let candidateSeason = identity.season;
      let candidateEpisode = identity.episode;
      if (featureDetails && typeof featureDetails === 'object') {
        const fd = featureDetails as { season_number?: unknown; episode_number?: unknown };
        if (typeof fd.season_number === 'number') candidateSeason = fd.season_number;
        if (typeof fd.episode_number === 'number') candidateEpisode = fd.episode_number;
      }

      const isHashMatch =
        Boolean(identity.videoHash) &&
        (attrs as { moviehash_match?: unknown }).moviehash_match === true;
      const releaseScore = computeReleaseSimilarity(
        identity.filename,
        releaseName ?? fileName,
      );
      const format: SubtitleFormat = fileName && /\.vtt$/i.test(fileName) ? 'vtt' : 'srt';

      results.push({
        candidateId: `opensubtitles:${fileId}`,
        providerName: this.name,
        origin: 'external',
        language: normalizedLanguage,
        format,
        contentId: identity.canonicalId,
        mediaType: identity.mediaType,
        ...(candidateSeason !== undefined ? { season: candidateSeason } : {}),
        ...(candidateEpisode !== undefined ? { episode: candidateEpisode } : {}),
        confidence: isHashMatch ? 'exact' : 'high',
        matchReason: isHashMatch
          ? `Exact OpenSubtitles moviehash match for ${identity.canonicalId} (${normalizedLanguage}).`
          : `OpenSubtitles REST API v1 match for ${identity.canonicalId} (${normalizedLanguage}).`,
        metadata: {
          ...(fileName !== undefined ? { filename: fileName } : {}),
          fileId,
          ...(releaseName !== undefined ? { releaseName } : {}),
          ...(downloadCount !== undefined ? { downloadCount } : {}),
          releaseScore,
          moviehashMatch: isHashMatch,
        },
        loadAsset: () => this.downloadAuthorizedAsset(fileId, normalizedLanguage, fileName),
      });
    }

    return results;
  }

  private async downloadAuthorizedAsset(
    fileId: number,
    normalizedLanguage: string,
    fileName?: string,
  ): Promise<RawSubtitleAsset | null> {
    const cached = this.getCachedDownload(fileId);
    if (cached) {
      this.setStatus('ok');
      return cached;
    }

    try {
      const downloadRes = await this.fetchWithTimeoutAndRetry(`${this.baseUrl}/download`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ file_id: fileId }),
      });

      if (downloadRes.status === 401 || downloadRes.status === 403) {
        this.setStatus('AUTH_ERROR');
        return null;
      }
      if (downloadRes.status === 429) {
        const retryAfter = Number(downloadRes.headers.get('retry-after') ?? 0);
        this.setStatus(
          'RATE_LIMITED',
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
        );
        return null;
      }
      if (!downloadRes.ok) {
        this.setStatus('UPSTREAM_ERROR');
        return null;
      }

      let downloadJson: unknown;
      try {
        downloadJson = await downloadRes.json();
      } catch {
        this.setStatus('MALFORMED_RESPONSE');
        return null;
      }

      const link =
        downloadJson &&
        typeof downloadJson === 'object' &&
        'link' in downloadJson &&
        typeof (downloadJson as { link?: unknown }).link === 'string'
          ? (downloadJson as { link: string }).link
          : null;

      if (!link || !/^https:\/\//i.test(link)) {
        this.setStatus('MALFORMED_RESPONSE');
        return null;
      }

      const fileRes = await this.fetchWithTimeoutAndRetry(link, {
        method: 'GET',
        headers: { 'User-Agent': this.userAgent },
      });
      if (!fileRes.ok) {
        this.setStatus('UPSTREAM_ERROR');
        return null;
      }

      const content = await fileRes.text();
      if (Buffer.byteLength(content, 'utf-8') > this.maxSubtitleBytes) {
        this.setStatus('TOO_LARGE');
        return null;
      }

      const asset: RawSubtitleAsset = {
        sourceId: `opensubtitles-${fileId}`,
        language: normalizedLanguage,
        format: detectSubtitleFormat(content, fileName),
        content,
      };
      this.putCachedDownload(fileId, asset);
      this.setStatus('ok');
      return asset;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        this.setStatus('TIMEOUT');
        return null;
      }
      this.setStatus('UPSTREAM_ERROR');
      return null;
    }
  }
}
