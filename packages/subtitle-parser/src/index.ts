import type { SubtitleFormat, SubtitleParseResult } from '@subtitleme/shared-types';
import { finalizeParseResult } from './blocks';
import { detectSubtitleFormat } from './detect-format';
import { parseSrt } from './srt-parser';
import { detectLineEnding, stripBom } from './text-normalizer';
import { parseVtt } from './vtt-parser';

export interface ParseOptions {
  /** Optional explicit format; when omitted, parser detects from content or fileName. */
  format?: SubtitleFormat;
  /** Optional file name used as a format-detection hint when content header is absent. */
  fileName?: string;
  /** Whether to discard cues with empty text after normalization. Defaults to true. */
  dropEmptyCues?: boolean;
  /** Whether to allow zero-duration cues (start === end). Defaults to false. */
  allowZeroDuration?: boolean;
}

export interface SubtitleParser {
  readonly supportedFormats: readonly SubtitleFormat[];
  parse(content: string, options?: ParseOptions): SubtitleParseResult;
}

export const SUPPORTED_SUBTITLE_FORMATS: readonly SubtitleFormat[] = ['srt', 'vtt'];

/**
 * Unified subtitle parsing API supporting explicit format dispatch or automatic detection.
 */
export function parseSubtitle(
  content: string,
  format?: SubtitleFormat,
  options: Omit<ParseOptions, 'format'> = {},
): SubtitleParseResult {
  const resolvedFormat = format ?? detectSubtitleFormat(content, options.fileName);

  if (resolvedFormat === 'srt') {
    return parseSrt(content, {
      ...(options.dropEmptyCues !== undefined ? { dropEmptyCues: options.dropEmptyCues } : {}),
      ...(options.allowZeroDuration !== undefined
        ? { allowZeroDuration: options.allowZeroDuration }
        : {}),
    });
  }

  if (resolvedFormat === 'vtt') {
    return parseVtt(content, {
      ...(options.dropEmptyCues !== undefined ? { dropEmptyCues: options.dropEmptyCues } : {}),
      ...(options.allowZeroDuration !== undefined
        ? { allowZeroDuration: options.allowZeroDuration }
        : {}),
    });
  }

  const { content: withoutBom, hasBom } = stripBom(content);
  const isEmpty = withoutBom.trim().length === 0;

  return finalizeParseResult(
    null,
    [],
    [
      {
        code: isEmpty ? 'EMPTY_INPUT' : 'UNSUPPORTED_FORMAT',
        severity: 'error',
        message: isEmpty
          ? 'Subtitle input is empty or contains only whitespace.'
          : 'Unable to detect a supported subtitle format (.srt or .vtt).',
        line: 1,
      },
    ],
    {
      hasBom,
      lineEnding: detectLineEnding(withoutBom),
      totalBlocks: 0,
      skippedBlocks: 0,
    },
    true,
  );
}

export function createSubtitleParser(): SubtitleParser {
  return {
    supportedFormats: SUPPORTED_SUBTITLE_FORMATS,
    parse(content: string, options: ParseOptions = {}): SubtitleParseResult {
      const { format, ...rest } = options;
      return parseSubtitle(content, format, rest);
    },
  };
}

export { detectSubtitleFormat } from './detect-format';
export { parseSrt, type SrtParseOptions } from './srt-parser';
export { parseVtt, type VttParseOptions } from './vtt-parser';
export {
  formatTimestamp,
  normalizeTimestamp,
  parseSrtTimestamp,
  parseVttTimestamp,
} from './timestamp';
export {
  decodeHtmlEntities,
  detectLineEnding,
  normalizeLineEndings,
  normalizeSubtitleText,
  stripBom,
  type BomResult,
  type NormalizedTextResult,
} from './text-normalizer';
export {
  decodeSubtitleBytes,
  type DecodedSubtitleText,
  type DetectedEncoding,
} from './encoding';
export { validateCues, type CueValidationOptions } from './validator';
