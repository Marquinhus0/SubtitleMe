import type { SubtitleFormat } from '@subtitleme/shared-types';
import { normalizeLineEndings, stripBom } from './text-normalizer';

const VTT_HEADER_RE = /^WEBVTT(?:[ \t].*)?$/;
const SRT_TIMING_LINE_RE = /^\d{1,3}:\d{2}:\d{2},\d{3}\s+-->\s+\d{1,3}:\d{2}:\d{2},\d{3}/m;
const VTT_SHORT_TIMING_RE = /^\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}\.\d{3}/m;
const DOT_TIMING_LINE_RE = /^\d{1,3}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{1,3}:\d{2}:\d{2}\.\d{3}/m;

/**
 * Detects subtitle format from file content and/or optional file name.
 * Content header takes precedence over file extension.
 */
export function detectSubtitleFormat(content: string, fileName?: string): SubtitleFormat | null {
  const { content: withoutBom } = stripBom(content);
  const normalized = normalizeLineEndings(withoutBom);
  const firstNonEmptyLine = normalized
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (firstNonEmptyLine && VTT_HEADER_RE.test(firstNonEmptyLine)) {
    return 'vtt';
  }

  if (fileName) {
    const lower = fileName.trim().toLowerCase();
    if (lower.endsWith('.vtt')) return 'vtt';
    if (lower.endsWith('.srt')) return 'srt';
  }

  if (SRT_TIMING_LINE_RE.test(normalized)) {
    return 'srt';
  }

  if (VTT_SHORT_TIMING_RE.test(normalized)) {
    return 'vtt';
  }

  if (DOT_TIMING_LINE_RE.test(normalized)) {
    return 'srt';
  }

  return null;
}
