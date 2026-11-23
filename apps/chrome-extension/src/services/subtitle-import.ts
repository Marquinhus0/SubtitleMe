import type {
  SubtitleCue,
  SubtitleDiagnostic,
  SubtitleFormat,
} from '@subtitleme/shared-types';
import {
  decodeSubtitleBytes,
  detectSubtitleFormat,
  parseSubtitle,
  type DetectedEncoding,
} from '@subtitleme/subtitle-parser';
import type { LocalSubtitleRecord } from '@subtitleme/subtitle-storage';

export const DEFAULT_MAX_SUBTITLE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export type ImportErrorCode =
  | 'UNSUPPORTED_EXTENSION'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_FILE'
  | 'INVALID_FORMAT'
  | 'INVALID_CONTENT'
  | 'DUPLICATE_IMPORT'
  | 'READ_FAILED';

export interface PendingSubtitleImport {
  fileName: string;
  fileSize: number;
  format: SubtitleFormat;
  encoding: DetectedEncoding;
  encodingWarning?: string;
  contentHash: string;
  cues: SubtitleCue[];
  previewCues: SubtitleCue[];
  cueCount: number;
  durationMs: number;
  warnings: SubtitleDiagnostic[];
  errors: SubtitleDiagnostic[];
  isDuplicate: boolean;
}

export type ImportPreparationResult =
  | { ok: true; pending: PendingSubtitleImport }
  | { ok: false; code: ImportErrorCode; message: string };

export interface PrepareImportOptions {
  maxSizeBytes?: number;
  existingHashes?: ReadonlySet<string>;
}

/**
 * Deterministic 64-bit FNV-1a hex fingerprint for duplicate file detection
 * without needing async WebCrypto or storing raw file blobs.
 */
export function computeContentHash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export function formatDurationMs(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '00:00';
  }
  const totalSeconds = Math.floor(durationMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getExtensionFormat(fileName: string): SubtitleFormat | null {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith('.srt')) return 'srt';
  if (lower.endsWith('.vtt')) return 'vtt';
  return null;
}

async function readFileAsBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    return new Uint8Array(await file.arrayBuffer());
  }
  const text = await file.text();
  return new TextEncoder().encode(text);
}

/**
 * Validates, decodes, detects actual format from content (never trusting
 * filename extension alone), parses cues, and builds a PendingSubtitleImport
 * for user preview before any IndexedDB write occurs.
 */
export async function prepareSubtitleImport(
  file: File,
  options: PrepareImportOptions = {},
): Promise<ImportPreparationResult> {
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SUBTITLE_FILE_BYTES;

  const extFormat = getExtensionFormat(file.name);
  if (!extFormat) {
    return {
      ok: false,
      code: 'UNSUPPORTED_EXTENSION',
      message: 'Unsupported file extension. Only .srt and .vtt files are supported.',
    };
  }

  if (file.size === 0) {
    return {
      ok: false,
      code: 'EMPTY_FILE',
      message: 'The selected subtitle file is empty.',
    };
  }

  // Reject oversized files BEFORE reading into memory
  if (file.size > maxSizeBytes) {
    return {
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: `File exceeds the maximum allowed size (${Math.round(maxSizeBytes / (1024 * 1024))} MB).`,
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = await readFileAsBytes(file);
  } catch {
    return {
      ok: false,
      code: 'READ_FAILED',
      message: 'Failed to read file bytes from disk.',
    };
  }

  const decoded = decodeSubtitleBytes(bytes);
  if (decoded.text.trim().length === 0) {
    return {
      ok: false,
      code: 'EMPTY_FILE',
      message: 'The selected subtitle file contains only whitespace.',
    };
  }

  // Detect format strictly from content first (do not trust extension alone)
  const contentFormat = detectSubtitleFormat(decoded.text);
  if (!contentFormat) {
    return {
      ok: false,
      code: 'INVALID_FORMAT',
      message: 'File content does not match valid SubRip (.srt) or WebVTT (.vtt) syntax.',
    };
  }

  const parseResult = parseSubtitle(decoded.text, contentFormat);
  if (parseResult.status === 'error' || parseResult.cues.length === 0) {
    return {
      ok: false,
      code: 'INVALID_CONTENT',
      message: parseResult.errors[0]?.message ?? 'No valid subtitle cues were found in this file.',
    };
  }

  let durationMs = 0;
  for (const cue of parseResult.cues) {
    if (cue.end > durationMs) {
      durationMs = cue.end;
    }
  }

  const contentHash = computeContentHash(decoded.text);
  const isDuplicate = options.existingHashes?.has(contentHash) ?? false;

  return {
    ok: true,
    pending: {
      fileName: file.name,
      fileSize: file.size,
      format: contentFormat,
      encoding: decoded.encoding,
      ...(decoded.warning !== undefined ? { encodingWarning: decoded.warning } : {}),
      contentHash,
      cues: parseResult.cues,
      previewCues: parseResult.cues.slice(0, 5),
      cueCount: parseResult.cues.length,
      durationMs,
      warnings: parseResult.warnings,
      errors: parseResult.errors,
      isDuplicate,
    },
  };
}

export function buildLocalSubtitleRecord(
  pending: PendingSubtitleImport,
  language: string,
): LocalSubtitleRecord {
  const now = Date.now();
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sub-${now}-${Math.random().toString(36).slice(2, 10)}`;

  // Strip any Vue reactive Proxy wrappers so IndexedDB / structuredClone never throws DataCloneError
  const plainCues: SubtitleCue[] = pending.cues.map((cue) => ({
    id: cue.id,
    start: cue.start,
    end: cue.end,
    text: cue.text,
    ...(cue.settings ? { settings: { ...cue.settings } } : {}),
  }));

  return {
    id,
    fileName: pending.fileName,
    fileSize: pending.fileSize,
    format: pending.format,
    language: language.trim() || 'und',
    contentHash: pending.contentHash,
    importedAt: now,
    updatedAt: now,
    cueCount: pending.cueCount,
    durationMs: pending.durationMs,
    cues: plainCues,
  };
}
