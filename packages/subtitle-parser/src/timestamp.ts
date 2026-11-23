import type { SubtitleFormat } from '@subtitleme/shared-types';

const SRT_TIMESTAMP_RE = /^(\d{1,3}):(\d{2}):(\d{2})[,.](\d{3})$/;
const VTT_FULL_TIMESTAMP_RE = /^(\d{1,3}):(\d{2}):(\d{2})\.(\d{3})$/;
const VTT_SHORT_TIMESTAMP_RE = /^(\d{2}):(\d{2})\.(\d{3})$/;

function toMilliseconds(hours: number, minutes: number, seconds: number, ms: number): number | null {
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    !Number.isInteger(ms)
  ) {
    return null;
  }

  if (hours < 0 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59 || ms < 0 || ms > 999) {
    return null;
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + ms;
}

/**
 * Parses an SRT timestamp (`HH:MM:SS,mmm` or tolerant `HH:MM:SS.mmm`)
 * into integer milliseconds without floating-point arithmetic.
 */
export function parseSrtTimestamp(raw: string): number | null {
  const trimmed = raw.trim();
  const match = SRT_TIMESTAMP_RE.exec(trimmed);
  if (!match) return null;

  const hours = Number.parseInt(match[1] ?? '', 10);
  const minutes = Number.parseInt(match[2] ?? '', 10);
  const seconds = Number.parseInt(match[3] ?? '', 10);
  const ms = Number.parseInt(match[4] ?? '', 10);

  return toMilliseconds(hours, minutes, seconds, ms);
}

/**
 * Parses a WebVTT timestamp (`HH:MM:SS.mmm` or `MM:SS.mmm`)
 * into integer milliseconds without floating-point arithmetic.
 */
export function parseVttTimestamp(raw: string): number | null {
  const trimmed = raw.trim();

  const fullMatch = VTT_FULL_TIMESTAMP_RE.exec(trimmed);
  if (fullMatch) {
    const hours = Number.parseInt(fullMatch[1] ?? '', 10);
    const minutes = Number.parseInt(fullMatch[2] ?? '', 10);
    const seconds = Number.parseInt(fullMatch[3] ?? '', 10);
    const ms = Number.parseInt(fullMatch[4] ?? '', 10);
    return toMilliseconds(hours, minutes, seconds, ms);
  }

  const shortMatch = VTT_SHORT_TIMESTAMP_RE.exec(trimmed);
  if (shortMatch) {
    const minutes = Number.parseInt(shortMatch[1] ?? '', 10);
    const seconds = Number.parseInt(shortMatch[2] ?? '', 10);
    const ms = Number.parseInt(shortMatch[3] ?? '', 10);
    return toMilliseconds(0, minutes, seconds, ms);
  }

  return null;
}

/**
 * Unified timestamp parser dispatching by subtitle format.
 */
export function normalizeTimestamp(raw: string, format: SubtitleFormat): number | null {
  return format === 'srt' ? parseSrtTimestamp(raw) : parseVttTimestamp(raw);
}

/**
 * Formats non-negative integer milliseconds into canonical SRT (`HH:MM:SS,mmm`)
 * or WebVTT (`HH:MM:SS.mmm`) timestamp syntax.
 */
export function formatTimestamp(ms: number, format: SubtitleFormat): string {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError(`Timestamp must be a non-negative finite number, received: ${ms}`);
  }

  const totalMs = Math.round(ms);
  const milliseconds = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(milliseconds).padStart(3, '0');
  const sep = format === 'srt' ? ',' : '.';

  return `${hh}:${mm}:${ss}${sep}${mmm}`;
}
