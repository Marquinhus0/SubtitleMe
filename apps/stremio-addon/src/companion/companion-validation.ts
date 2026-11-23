import type { SubtitleFormat } from '@subtitleme/shared-types';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import { findLanguageDescriptor } from '../config/addon-config';
import { MAX_COMPANION_SUBTITLE_BYTES } from './companion-config';
import type { CompanionUploadRequest, ContentAssociationKind } from './companion-types';

const ALLOWED_EXTENSION_RE = /\.(srt|vtt)$/i;
const STREMIO_IMDB_ID_RE = /^tt\d{5,12}(?::\d{1,4}:\d{1,4})?$/;
const SAFE_USER_CONTENT_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,95}$/;
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const PATH_TRAVERSAL_RE = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const SRT_TIMESTAMP_RE = /\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}/;
const VTT_HEADER_RE = /^\uFEFF?WEBVTT(?:[ \t].*)?(?:\r?\n|$)/;
const BINARY_DISALLOWED_RE = /\0/;
const HTML_SCRIPT_INJECTION_RE = /<\s*(?:!doctype|html|script|iframe|object|embed)\b/i;

export interface ValidatedSubtitleUpload {
  readonly contentId: string;
  readonly associationKind: ContentAssociationKind;
  readonly language: string;
  readonly format: SubtitleFormat;
  readonly filename: string;
  readonly content: string;
  readonly byteLength: number;
  readonly cueCount: number;
  readonly sampleLines: readonly string[];
}

export interface ValidationFailure {
  readonly ok: false;
  readonly error: string;
  readonly statusCode: 400 | 413;
}

export interface ValidationSuccess {
  readonly ok: true;
  readonly value: ValidatedSubtitleUpload;
}

export type UploadValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Normalizes and validates explicit content association identifiers.
 * Accepts Stremio/IMDb IDs (e.g. `tt1254207`, `tt0903747:1:1`) or explicit user-defined IDs.
 * Rejects URLs, filesystem paths, traversal sequences, and control characters.
 */
export function validateContentId(rawContentId: unknown): {
  valid: boolean;
  normalized?: string;
  kind?: ContentAssociationKind;
  error?: string;
} {
  if (typeof rawContentId !== 'string') {
    return { valid: false, error: 'contentId is required and must be a string.' };
  }

  const trimmed = rawContentId.trim();
  if (trimmed.length < 2 || trimmed.length > 96) {
    return { valid: false, error: 'contentId must be between 2 and 96 characters.' };
  }

  if (URL_SCHEME_RE.test(trimmed) || trimmed.includes('/') || trimmed.includes('\\') || PATH_TRAVERSAL_RE.test(trimmed)) {
    return {
      valid: false,
      error: 'contentId cannot be a URL or filesystem path. Use a Stremio ID (e.g. tt1254207) or plain identifier.',
    };
  }

  if (STREMIO_IMDB_ID_RE.test(trimmed)) {
    return { valid: true, normalized: trimmed, kind: 'stremio-id' };
  }

  if (!SAFE_USER_CONTENT_ID_RE.test(trimmed)) {
    return {
      valid: false,
      error: 'contentId contains unsupported characters. Use letters, numbers, ".", "_", ":", or "-".',
    };
  }

  return { valid: true, normalized: trimmed, kind: 'user-id' };
}

/**
 * Extracts a safe basename and rejects URLs, absolute paths, and path traversal.
 * Filenames are kept purely as auxiliary display metadata — never opened on disk.
 */
export function validateSubtitleFilename(rawFilename: unknown): {
  valid: boolean;
  filename?: string;
  declaredFormat?: SubtitleFormat;
  error?: string;
} {
  if (typeof rawFilename !== 'string' || rawFilename.trim().length === 0) {
    return { valid: false, error: 'filename is required.' };
  }

  const trimmed = rawFilename.trim();
  if (
    URL_SCHEME_RE.test(trimmed) ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    PATH_TRAVERSAL_RE.test(trimmed)
  ) {
    return {
      valid: false,
      error: 'filename must be a plain file name without directory paths or URLs.',
    };
  }

  const extMatch = ALLOWED_EXTENSION_RE.exec(trimmed);
  if (!extMatch?.[1]) {
    return {
      valid: false,
      error: 'Unsupported subtitle extension. Only .srt and .vtt files are accepted.',
    };
  }

  const declaredFormat = extMatch[1].toLowerCase() as SubtitleFormat;
  return {
    valid: true,
    filename: trimmed.slice(0, 160),
    declaredFormat,
  };
}

/**
 * Validates a Companion subtitle upload end-to-end:
 * 1. Rejects extraneous credential or URL fields.
 * 2. Validates contentId, language, filename, and extension.
 * 3. Enforces 5 MB byte cap.
 * 4. Inspects real content bytes to detect spoofed extensions, binary data, or HTML/scripts.
 * 5. Parses with `@subtitleme/subtitle-parser` and requires >= 1 valid cue.
 */
export function validateCompanionUpload(
  rawPayload: unknown,
  maxBytes: number = MAX_COMPANION_SUBTITLE_BYTES,
): UploadValidationResult {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return { ok: false, statusCode: 400, error: 'Request body must be a JSON object.' };
  }

  const record = rawPayload as Record<string, unknown>;

  // Reject forbidden fields (arbitrary URLs, filesystem paths, or external credentials)
  for (const forbiddenKey of ['url', 'filePath', 'path', 'apiKey', 'password', 'token']) {
    if (forbiddenKey in record && record[forbiddenKey] !== undefined) {
      return {
        ok: false,
        statusCode: 400,
        error: `Field "${forbiddenKey}" is not permitted in local subtitle uploads.`,
      };
    }
  }

  const payload = rawPayload as Partial<CompanionUploadRequest>;

  const contentIdCheck = validateContentId(payload.contentId);
  if (!contentIdCheck.valid || !contentIdCheck.normalized || !contentIdCheck.kind) {
    return { ok: false, statusCode: 400, error: contentIdCheck.error ?? 'Invalid contentId.' };
  }

  if (typeof payload.language !== 'string') {
    return { ok: false, statusCode: 400, error: 'language is required.' };
  }
  const langDesc = findLanguageDescriptor(payload.language);
  if (!langDesc) {
    return {
      ok: false,
      statusCode: 400,
      error: `Unsupported language "${payload.language}".`,
    };
  }

  const filenameCheck = validateSubtitleFilename(payload.filename);
  if (!filenameCheck.valid || !filenameCheck.filename || !filenameCheck.declaredFormat) {
    return { ok: false, statusCode: 400, error: filenameCheck.error ?? 'Invalid filename.' };
  }

  if (typeof payload.content !== 'string' || payload.content.trim().length === 0) {
    return { ok: false, statusCode: 400, error: 'Subtitle content must be a non-empty string.' };
  }

  const byteLength = Buffer.byteLength(payload.content, 'utf-8');
  if (byteLength > maxBytes) {
    return {
      ok: false,
      statusCode: 413,
      error: `Subtitle file exceeds maximum allowed size of ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
    };
  }

  // Reject binary payloads or HTML/script documents disguised as .srt/.vtt
  if (BINARY_DISALLOWED_RE.test(payload.content)) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Invalid subtitle content: binary bytes detected (possible spoofed extension).',
    };
  }

  if (HTML_SCRIPT_INJECTION_RE.test(payload.content)) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Invalid subtitle content: HTML or executable markup is not permitted.',
    };
  }

  const trimmedContent = payload.content.trimStart();
  const declaredFormat = filenameCheck.declaredFormat;

  // Verify real file signature matches declared extension (blocks spoofed extensions)
  if (declaredFormat === 'vtt' && !VTT_HEADER_RE.test(trimmedContent)) {
    return {
      ok: false,
      statusCode: 400,
      error: 'File has .vtt extension but does not start with a valid WEBVTT header.',
    };
  }

  if (declaredFormat === 'srt') {
    if (VTT_HEADER_RE.test(trimmedContent)) {
      return {
        ok: false,
        statusCode: 400,
        error: 'File has .srt extension but contains a WebVTT header. Rename to .vtt or upload valid SRT.',
      };
    }
    if (!SRT_TIMESTAMP_RE.test(trimmedContent)) {
      return {
        ok: false,
        statusCode: 400,
        error: 'File has .srt extension but does not contain valid SRT timing blocks.',
      };
    }
  }

  // Parse using shared @subtitleme/subtitle-parser
  const parsed = parseSubtitle(payload.content, declaredFormat);
  if (parsed.status === 'error' || parsed.cues.length === 0) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Subtitle file could not be parsed or contains zero valid cues.',
    };
  }

  const sampleLines = parsed.cues.slice(0, 2).map((cue) => cue.text);

  return {
    ok: true,
    value: {
      contentId: contentIdCheck.normalized,
      associationKind: contentIdCheck.kind,
      language: langDesc.bcp47,
      format: declaredFormat,
      filename: filenameCheck.filename,
      content: payload.content,
      byteLength,
      cueCount: parsed.cues.length,
      sampleLines,
    },
  };
}
