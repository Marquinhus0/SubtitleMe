import type { SubtitleFormat } from '@subtitleme/shared-types';
import type { StremioContentType } from '../types/stremio';

export interface SubtitleSourceQuery {
  type: StremioContentType;
  videoId: string;
  language: string;
  videoHash?: string;
  videoSize?: number;
  filename?: string;
}

export interface RawSubtitleAsset {
  sourceId: string;
  language: string;
  format: SubtitleFormat;
  content: string;
}

/**
 * Provider abstraction decoupling Stremio addon orchestration from where
 * source subtitles originate (local fixtures, authorized APIs, or user-provided sources).
 */
export interface SubtitleSourceProvider {
  readonly name: string;
  fetchSubtitle(query: SubtitleSourceQuery): Promise<RawSubtitleAsset | null>;
}
