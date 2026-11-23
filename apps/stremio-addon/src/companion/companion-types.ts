import type { SubtitleFormat, SubtitleOrder } from '@subtitleme/shared-types';

export type ContentAssociationKind = 'stremio-id' | 'user-id';

export interface CompanionSubtitleRecord {
  /** Unique internal identifier for this stored track. */
  readonly id: string;
  /** Normalized explicit content identifier (Stremio ID like `tt1254207` / `tt0903747:1:1` or user ID). */
  readonly contentId: string;
  /** Whether the association is a recognized Stremio/IMDb ID or a custom user-defined ID. */
  readonly associationKind: ContentAssociationKind;
  /** Normalized BCP-47 language tag (e.g. `en`, `pt-BR`). */
  readonly language: string;
  /** Subtitle format verified by content inspection and parsing. */
  readonly format: SubtitleFormat;
  /** Sanitized original basename (auxiliary metadata only, NEVER used as filesystem path or sole match). */
  readonly filename: string;
  /** Raw subtitle text content (kept only in local memory, never logged). */
  readonly content: string;
  /** Byte size of the validated subtitle content. */
  readonly byteLength: number;
  /** Number of parsed cues verified by `@subtitleme/subtitle-parser`. */
  readonly cueCount: number;
  /** Upload timestamp in epoch milliseconds. */
  readonly uploadedAt: number;
}

/** Public metadata projection safe for API responses and UI listing (omits raw full content). */
export interface CompanionSubtitleSummary {
  readonly id: string;
  readonly contentId: string;
  readonly associationKind: ContentAssociationKind;
  readonly language: string;
  readonly format: SubtitleFormat;
  readonly filename: string;
  readonly byteLength: number;
  readonly cueCount: number;
  readonly uploadedAt: number;
  /** Short first-cue preview lines (max 2 cues) for UI confirmation. */
  readonly sampleLines: readonly string[];
}

export interface CompanionUploadRequest {
  contentId: string;
  language: string;
  filename: string;
  content: string;
}

export interface CompanionPreviewRequest {
  contentId: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  primaryOffsetMs?: number;
  secondaryOffsetMs?: number;
  order?: SubtitleOrder;
  limit?: number;
}

export interface CompanionPreviewCue {
  readonly startTime: number;
  readonly endTime: number;
  readonly text: string;
}

export interface CompanionHealthResponse {
  readonly ok: true;
  readonly service: 'subtitleme-local-companion';
  readonly host: '127.0.0.1';
  readonly localOnly: true;
  readonly registeredSubtitles: number;
}
