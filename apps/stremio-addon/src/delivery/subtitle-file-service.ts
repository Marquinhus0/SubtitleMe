import { createHash, randomBytes } from 'node:crypto';
import type { SubtitleTrack } from '@subtitleme/shared-types';
import { mergeSubtitleTracks, serializeSubtitleCues } from '@subtitleme/subtitle-core';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import type { StremioAddonConfig } from '../config/addon-config';
import type { RawSubtitleAsset } from '../sources/subtitle-source.interface';
import { GeneratedSubtitleCache } from './generated-subtitle-cache';

export const MAX_SOURCE_SUBTITLE_BYTES = 5 * 1024 * 1024; // 5 MB safety limit
export const OPAQUE_TOKEN_REGEX = /^[a-f0-9]{32,64}$/;

export interface GeneratedSubtitleDelivery {
  token: string;
  url: string;
  cueCount: number;
  fromCache: boolean;
  sessionScope: string;
}

export interface SubtitleFileServiceOptions {
  baseUrl: string;
  cache?: GeneratedSubtitleCache;
  maxSourceBytes?: number;
  defaultSessionScope?: string;
}

function buildContentFingerprint(
  videoId: string,
  primary: RawSubtitleAsset,
  secondary: RawSubtitleAsset,
  config: StremioAddonConfig,
): string {
  const hash = createHash('sha256');
  hash.update(
    JSON.stringify({
      videoId,
      primaryId: primary.sourceId,
      primaryContentHash: createHash('sha256').update(primary.content).digest('hex'),
      secondaryId: secondary.sourceId,
      secondaryContentHash: createHash('sha256').update(secondary.content).digest('hex'),
      primaryLanguage: config.primaryLanguage,
      secondaryLanguage: config.secondaryLanguage,
      primaryOffsetMs: config.primaryOffsetMs,
      secondaryOffsetMs: config.secondaryOffsetMs,
      order: config.order,
    }),
  );
  return hash.digest('hex');
}

function generateOpaqueAccessToken(): string {
  return randomBytes(24).toString('hex'); // 48 hex chars (192 bits of cryptographic entropy)
}

/**
 * Parses two raw subtitle assets using `@subtitleme/subtitle-parser`, merges them
 * via `@subtitleme/subtitle-core` (`mergeSubtitleTracks`), serializes to WebVTT,
 * and caches the output behind an opaque, unpredictable, session-scoped HTTP delivery URL.
 *
 * Note: The opaque token is a non-guessable delivery handle, NOT an authentication credential.
 */
export class SubtitleFileService {
  private readonly baseUrl: string;
  private readonly cache: GeneratedSubtitleCache;
  private readonly maxSourceBytes: number;
  private readonly defaultSessionScope: string;

  public constructor(options: SubtitleFileServiceOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.cache = options.cache ?? new GeneratedSubtitleCache();
    this.maxSourceBytes = options.maxSourceBytes ?? MAX_SOURCE_SUBTITLE_BYTES;
    this.defaultSessionScope = options.defaultSessionScope ?? 'default';
  }

  public getCache(): GeneratedSubtitleCache {
    return this.cache;
  }

  public getVttByToken(token: string, expectedSessionScope?: string): string | null {
    if (!OPAQUE_TOKEN_REGEX.test(token)) {
      return null;
    }
    return this.cache.get(token, expectedSessionScope)?.vttContent ?? null;
  }

  public invalidateBySourceId(sourceId: string): number {
    return this.cache.invalidateBySourceId(sourceId);
  }

  public invalidateBySession(sessionScope: string): number {
    return this.cache.invalidateBySession(sessionScope);
  }

  public generateCombinedVtt(
    videoId: string,
    primaryAsset: RawSubtitleAsset,
    secondaryAsset: RawSubtitleAsset,
    config: StremioAddonConfig,
    sessionScope: string = this.defaultSessionScope,
  ): GeneratedSubtitleDelivery {
    if (
      Buffer.byteLength(primaryAsset.content, 'utf-8') > this.maxSourceBytes ||
      Buffer.byteLength(secondaryAsset.content, 'utf-8') > this.maxSourceBytes
    ) {
      throw new Error('Source subtitle exceeds maximum permitted byte size.');
    }

    const fingerprint = buildContentFingerprint(videoId, primaryAsset, secondaryAsset, config);
    const cached = this.cache.getByFingerprint(sessionScope, fingerprint);
    if (cached) {
      return {
        token: cached.token,
        url: `${this.baseUrl}/generated/${cached.token}.vtt`,
        cueCount: cached.cueCount,
        fromCache: true,
        sessionScope,
      };
    }

    const parsedPrimary = parseSubtitle(primaryAsset.content, primaryAsset.format);
    if (parsedPrimary.status === 'error' || parsedPrimary.cues.length === 0) {
      throw new Error('Failed to parse primary subtitle track.');
    }

    const parsedSecondary = parseSubtitle(secondaryAsset.content, secondaryAsset.format);
    if (parsedSecondary.status === 'error' || parsedSecondary.cues.length === 0) {
      throw new Error('Failed to parse secondary subtitle track.');
    }

    const primaryTrack: SubtitleTrack = {
      id: primaryAsset.sourceId,
      language: primaryAsset.language,
      label: primaryAsset.language,
      source: 'local',
      cues: parsedPrimary.cues,
      offset: config.primaryOffsetMs,
      enabled: true,
    };

    const secondaryTrack: SubtitleTrack = {
      id: secondaryAsset.sourceId,
      language: secondaryAsset.language,
      label: secondaryAsset.language,
      source: 'local',
      cues: parsedSecondary.cues,
      offset: config.secondaryOffsetMs,
      enabled: true,
    };

    const mergedCues = mergeSubtitleTracks(primaryTrack, secondaryTrack, {
      order: config.order,
    });
    const vttContent = serializeSubtitleCues(mergedCues, 'vtt');
    const token = generateOpaqueAccessToken();

    this.cache.set(token, vttContent, {
      sessionScope,
      fingerprint,
      sourceIds: [primaryAsset.sourceId, secondaryAsset.sourceId],
      cueCount: mergedCues.length,
    });

    return {
      token,
      url: `${this.baseUrl}/generated/${token}.vtt`,
      cueCount: mergedCues.length,
      fromCache: false,
      sessionScope,
    };
  }
}
