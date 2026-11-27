import type { SubtitleFormat } from '@subtitleme/shared-types';
import { findLanguageDescriptor } from '../config/addon-config';
import { MAX_SOURCE_SUBTITLE_BYTES } from '../delivery/subtitle-file-service';
import type {
  RawSubtitleAsset,
  SubtitleSourceProvider,
  SubtitleSourceQuery,
} from './subtitle-source.interface';

export const OPENSUBTITLES_DEFAULT_BASE_URL = 'https://api.opensubtitles.com/api/v1';
export const OPENSUBTITLES_DEFAULT_TIMEOUT_MS = 8_000;

export interface OpenSubtitlesSourceOptions {
  /** Must be explicitly set to `true` by the user (opt-in). Defaults to `false`. */
  enabled?: boolean;
  /** User-supplied OpenSubtitles REST API v1 key. Never logged or stored in subtitle cache. */
  apiKey?: string;
  /** Optional user JWT bearer token returned by OpenSubtitles `/login` for authenticated quota. */
  bearerToken?: string;
  /** Valid application User-Agent required by OpenSubtitles API docs. */
  userAgent?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxSubtitleBytes?: number;
  /** Injectable fetch implementation for testing without live network access. */
  fetchFn?: typeof fetch;
}

export type OpenSubtitlesErrorCode =
  | 'DISABLED'
  | 'MISSING_API_KEY'
  | 'INVALID_CONTENT_ID'
  | 'AUTH_ERROR'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'MALFORMED_RESPONSE'
  | 'NOT_FOUND'
  | 'TOO_LARGE';

export interface OpenSubtitlesFetchDiagnostics {
  readonly lastStatus: 'ok' | OpenSubtitlesErrorCode;
  readonly retryAfterSeconds?: number;
}

const IMDB_MOVIE_OR_EPISODE_RE = /^tt(\d{5,12})(?::(\d{1,4}):(\d{1,4}))?$/;

function mapBcp47ToOpenSubtitlesLanguage(bcp47: string): string | null {
  const lower = bcp47.trim().toLowerCase();
  if (lower === 'pt-br') return 'pt-br';
  const desc = findLanguageDescriptor(bcp47);
  if (!desc) return null;
  return desc.bcp47.toLowerCase();
}

function detectFormatFromContentOrName(content: string, fileName?: string): SubtitleFormat {
  if (/^\uFEFF?WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(content.trimStart())) {
    return 'vtt';
  }
  if (fileName && /\.vtt$/i.test(fileName)) {
    return 'vtt';
  }
  return 'srt';
}

/**
 * Opt-in external `SubtitleSourceProvider` implementing the official
 * OpenSubtitles REST API v1 contract (`GET /subtitles`, `POST /download`).
 *
 * Privacy & Compliance guarantees:
 * - Disabled by default (`enabled: false`); never sends network requests unless opted in.
 * - Requires user-supplied `apiKey`; never scrapes web pages or bypasses auth.
 * - Never writes `apiKey` or `bearerToken` into returned `RawSubtitleAsset` metadata or logs.
 * - Never uploads local user subtitle files.
 * - Gracefully handles 401/403, 429 rate limits, timeouts, malformed JSON, and empty results.
 */
export class OpenSubtitlesSourceProvider implements SubtitleSourceProvider {
  public readonly name = 'opensubtitles-rest-v1';

  private readonly enabled: boolean;
  private readonly apiKey: string;
  private readonly bearerToken: string | undefined;
  private readonly userAgent: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxSubtitleBytes: number;
  private readonly fetchFn: typeof fetch;
  private diagnostics: OpenSubtitlesFetchDiagnostics = { lastStatus: 'DISABLED' };

  public constructor(options: OpenSubtitlesSourceOptions = {}) {
    this.enabled = options.enabled === true;
    this.apiKey = (options.apiKey ?? '').trim();
    this.bearerToken = options.bearerToken?.trim() || undefined;
    this.userAgent = options.userAgent ?? 'SubtitleMe v1.0.1';
    this.baseUrl = (options.baseUrl ?? OPENSUBTITLES_DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? OPENSUBTITLES_DEFAULT_TIMEOUT_MS;
    this.maxSubtitleBytes = options.maxSubtitleBytes ?? MAX_SOURCE_SUBTITLE_BYTES;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public getDiagnostics(): OpenSubtitlesFetchDiagnostics {
    return this.diagnostics;
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

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchFn(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  public async fetchSubtitle(query: SubtitleSourceQuery): Promise<RawSubtitleAsset | null> {
    if (!this.enabled) {
      this.diagnostics = { lastStatus: 'DISABLED' };
      return null;
    }

    if (this.apiKey.length === 0) {
      this.diagnostics = { lastStatus: 'MISSING_API_KEY' };
      return null;
    }

    const idMatch = IMDB_MOVIE_OR_EPISODE_RE.exec(query.videoId.trim());
    if (!idMatch?.[1]) {
      this.diagnostics = { lastStatus: 'INVALID_CONTENT_ID' };
      return null;
    }

    const osLang = mapBcp47ToOpenSubtitlesLanguage(query.language);
    if (!osLang) {
      this.diagnostics = { lastStatus: 'NOT_FOUND' };
      return null;
    }

    const params = new URLSearchParams();
    params.set('imdb_id', idMatch[1]);
    params.set('languages', osLang);
    if (idMatch[2] && idMatch[3]) {
      params.set('season_number', idMatch[2]);
      params.set('episode_number', idMatch[3]);
    }
    if (query.videoHash) {
      params.set('moviehash', query.videoHash);
    }

    try {
      // 1. Search candidate subtitles via official GET /api/v1/subtitles
      const searchRes = await this.fetchWithTimeout(
        `${this.baseUrl}/subtitles?${params.toString()}`,
        {
          method: 'GET',
          headers: this.buildHeaders(),
        },
      );

      if (searchRes.status === 401 || searchRes.status === 403) {
        this.diagnostics = { lastStatus: 'AUTH_ERROR' };
        return null;
      }
      if (searchRes.status === 429) {
        const retryAfter = Number(searchRes.headers.get('retry-after') ?? 0);
        this.diagnostics = {
          lastStatus: 'RATE_LIMITED',
          ...(Number.isFinite(retryAfter) && retryAfter > 0
            ? { retryAfterSeconds: retryAfter }
            : {}),
        };
        return null;
      }
      if (!searchRes.ok) {
        this.diagnostics = { lastStatus: 'UPSTREAM_ERROR' };
        return null;
      }

      let searchJson: unknown;
      try {
        searchJson = await searchRes.json();
      } catch {
        this.diagnostics = { lastStatus: 'MALFORMED_RESPONSE' };
        return null;
      }

      const fileCandidate = extractBestFileCandidate(searchJson);
      if (!fileCandidate) {
        this.diagnostics = { lastStatus: 'NOT_FOUND' };
        return null;
      }

      // 2. Request temporary download link via official POST /api/v1/download
      const downloadRes = await this.fetchWithTimeout(`${this.baseUrl}/download`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ file_id: fileCandidate.fileId }),
      });

      if (downloadRes.status === 401 || downloadRes.status === 403) {
        this.diagnostics = { lastStatus: 'AUTH_ERROR' };
        return null;
      }
      if (downloadRes.status === 429) {
        const retryAfter = Number(downloadRes.headers.get('retry-after') ?? 0);
        this.diagnostics = {
          lastStatus: 'RATE_LIMITED',
          ...(Number.isFinite(retryAfter) && retryAfter > 0
            ? { retryAfterSeconds: retryAfter }
            : {}),
        };
        return null;
      }
      if (!downloadRes.ok) {
        this.diagnostics = { lastStatus: 'UPSTREAM_ERROR' };
        return null;
      }

      let downloadJson: unknown;
      try {
        downloadJson = await downloadRes.json();
      } catch {
        this.diagnostics = { lastStatus: 'MALFORMED_RESPONSE' };
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
        this.diagnostics = { lastStatus: 'MALFORMED_RESPONSE' };
        return null;
      }

      // 3. Fetch raw subtitle bytes from the authorized temporary link
      const fileRes = await this.fetchWithTimeout(link, {
        method: 'GET',
        headers: { 'User-Agent': this.userAgent },
      });

      if (!fileRes.ok) {
        this.diagnostics = { lastStatus: 'UPSTREAM_ERROR' };
        return null;
      }

      const content = await fileRes.text();
      if (Buffer.byteLength(content, 'utf-8') > this.maxSubtitleBytes) {
        this.diagnostics = { lastStatus: 'TOO_LARGE' };
        return null;
      }

      const langDesc = findLanguageDescriptor(query.language);
      this.diagnostics = { lastStatus: 'ok' };
      return {
        sourceId: `opensubtitles-${fileCandidate.fileId}`,
        language: langDesc?.bcp47 ?? query.language,
        format: detectFormatFromContentOrName(content, fileCandidate.fileName),
        content,
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        this.diagnostics = { lastStatus: 'TIMEOUT' };
        return null;
      }
      this.diagnostics = { lastStatus: 'UPSTREAM_ERROR' };
      return null;
    }
  }
}

function extractBestFileCandidate(
  searchJson: unknown,
): { fileId: number; fileName?: string } | null {
  if (!searchJson || typeof searchJson !== 'object' || !('data' in searchJson)) {
    return null;
  }

  const data = (searchJson as { data?: unknown }).data;
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const attributes = (item as { attributes?: unknown }).attributes;
    if (!attributes || typeof attributes !== 'object') continue;
    const files = (attributes as { files?: unknown }).files;
    if (!Array.isArray(files) || files.length === 0) continue;
    const firstFile = files[0];
    if (
      firstFile &&
      typeof firstFile === 'object' &&
      typeof (firstFile as { file_id?: unknown }).file_id === 'number'
    ) {
      const fileName =
        typeof (firstFile as { file_name?: unknown }).file_name === 'string'
          ? (firstFile as { file_name: string }).file_name
          : undefined;
      return {
        fileId: (firstFile as { file_id: number }).file_id,
        ...(fileName !== undefined ? { fileName } : {}),
      };
    }
  }

  return null;
}
