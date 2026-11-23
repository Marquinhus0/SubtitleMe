import type { SubtitleCue, SubtitleFormat } from '@subtitleme/shared-types';

export interface LocalSubtitleRecord {
  id: string;
  fileName: string;
  fileSize: number;
  format: SubtitleFormat;
  /** BCP-47 language identifier (e.g. 'en', 'pt-BR') or 'und' when unassigned. */
  language: string;
  /** Deterministic content fingerprint used for duplicate import prevention. */
  contentHash: string;
  importedAt: number;
  updatedAt: number;
  cueCount: number;
  durationMs: number;
  cues: SubtitleCue[];
  /**
   * Optional raw text retained only when explicitly requested.
   * Omitted by default to minimize IndexedDB footprint.
   */
  originalContent?: string;
}

export type LocalSubtitleUpdatePatch = Partial<
  Pick<LocalSubtitleRecord, 'language' | 'fileName' | 'cues' | 'cueCount' | 'durationMs'>
>;

export interface SubtitleStorageUsage {
  recordCount: number;
  totalCues: number;
  estimatedBytes: number;
}

export type StorageErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'DUPLICATE_IMPORT'
  | 'NOT_FOUND'
  | 'READ_FAILED'
  | 'WRITE_FAILED'
  | 'DELETE_FAILED';

export class SubtitleStorageError extends Error {
  public readonly code: StorageErrorCode;

  public constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = 'SubtitleStorageError';
    this.code = code;
  }
}

export interface LocalSubtitleRepository {
  saveSubtitle(record: LocalSubtitleRecord): Promise<LocalSubtitleRecord>;
  getSubtitle(id: string): Promise<LocalSubtitleRecord | null>;
  getAllSubtitles(): Promise<LocalSubtitleRecord[]>;
  updateSubtitle(id: string, patch: LocalSubtitleUpdatePatch): Promise<LocalSubtitleRecord>;
  deleteSubtitle(id: string): Promise<boolean>;
  clearAllSubtitles(): Promise<void>;
  getStorageUsage(): Promise<SubtitleStorageUsage>;
  close(): void;
}

export function estimateRecordBytes(record: LocalSubtitleRecord): number {
  return new TextEncoder().encode(JSON.stringify(record)).byteLength;
}
