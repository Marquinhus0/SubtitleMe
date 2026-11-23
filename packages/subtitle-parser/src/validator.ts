import type { SubtitleCue, SubtitleDiagnostic } from '@subtitleme/shared-types';

export interface CueValidationOptions {
  allowZeroDuration?: boolean;
}

/**
 * Validates a list of normalized SubtitleCues and returns structured diagnostics.
 * Overlapping cues and duplicate IDs produce diagnostics without discarding cues.
 */
export function validateCues(
  cues: readonly SubtitleCue[],
  options: CueValidationOptions = {},
): SubtitleDiagnostic[] {
  const diagnostics: SubtitleDiagnostic[] = [];
  const seenIds = new Set<string>();
  const allowZeroDuration = options.allowZeroDuration ?? false;

  for (let i = 0; i < cues.length; i += 1) {
    const cue = cues[i];
    if (!cue) continue;

    if (!cue.id || cue.id.trim().length === 0) {
      diagnostics.push({
        code: 'MALFORMED_CUE_BLOCK',
        severity: 'warning',
        message: `Cue at index ${i} has an empty identifier.`,
        cueIndex: i,
      });
    } else if (seenIds.has(cue.id)) {
      diagnostics.push({
        code: 'DUPLICATE_CUE_ID',
        severity: 'warning',
        message: `Duplicate cue identifier "${cue.id}" encountered.`,
        cueIndex: i,
      });
    } else {
      seenIds.add(cue.id);
    }

    if (!Number.isInteger(cue.start) || cue.start < 0 || !Number.isInteger(cue.end) || cue.end < 0) {
      diagnostics.push({
        code: 'INVALID_TIMESTAMP',
        severity: 'error',
        message: `Cue "${cue.id}" contains negative or non-integer timestamps (${cue.start} -> ${cue.end}).`,
        cueIndex: i,
      });
    } else if (cue.end < cue.start) {
      diagnostics.push({
        code: 'INVALID_TIMESTAMP_ORDER',
        severity: 'error',
        message: `Cue "${cue.id}" ends before it starts (${cue.end} ms < ${cue.start} ms).`,
        cueIndex: i,
      });
    } else if (cue.end === cue.start) {
      diagnostics.push({
        code: 'ZERO_DURATION_CUE',
        severity: allowZeroDuration ? 'warning' : 'error',
        message: `Cue "${cue.id}" has zero duration (${cue.start} ms).`,
        cueIndex: i,
      });
    }

    if (cue.text.trim().length === 0) {
      diagnostics.push({
        code: 'EMPTY_CUE_TEXT',
        severity: 'warning',
        message: `Cue "${cue.id}" has empty text content.`,
        cueIndex: i,
      });
    }

    if (i > 0) {
      const prev = cues[i - 1];
      if (prev && cue.start < prev.end) {
        diagnostics.push({
          code: 'OVERLAPPING_CUES',
          severity: 'info',
          message: `Cue "${cue.id}" (${cue.start} ms) overlaps previous cue "${prev.id}" (ends at ${prev.end} ms). Overlap preserved.`,
          cueIndex: i,
        });
      }
    }
  }

  return diagnostics;
}
