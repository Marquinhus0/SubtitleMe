import type { SubtitleCue } from '@subtitleme/shared-types';

/**
 * Precomputed immutable index for O(log n) active cue lookup with full support
 * for overlapping cues via a prefix-maximum end-time array.
 *
 * Interval policy: half-open `[start, end)` — a cue is active at `timeMs`
 * if and only if `cue.start <= timeMs && timeMs < cue.end`.
 */
export interface CueIndex {
  readonly cues: readonly SubtitleCue[];
  readonly maxEndPrefix: readonly number[];
}

export function buildCueIndex(cues: readonly SubtitleCue[]): CueIndex {
  if (cues.length === 0) {
    return { cues: [], maxEndPrefix: [] };
  }

  const sorted = [...cues].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.end - b.end;
  });

  const maxEndPrefix = new Array<number>(sorted.length);
  let runningMaxEnd = -1;
  for (let i = 0; i < sorted.length; i += 1) {
    const cue = sorted[i];
    if (cue && cue.end > runningMaxEnd) {
      runningMaxEnd = cue.end;
    }
    maxEndPrefix[i] = runningMaxEnd;
  }

  return { cues: sorted, maxEndPrefix };
}

/**
 * Binary searches for the rightmost index where `cues[i].start <= timeMs`.
 * Returns -1 if `timeMs` is before the first cue.
 */
function findRightmostStartIndex(cues: readonly SubtitleCue[], timeMs: number): number {
  let low = 0;
  let high = cues.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const cue = cues[mid];
    if (cue && cue.start <= timeMs) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

/**
 * Finds all cues active at `timeMs` using O(log n) binary search plus
 * prefix-max pruning for overlapping cues. Returns cues in chronological order.
 *
 * Interval policy: half-open `[start, end)`.
 */
export function findActiveCues(index: CueIndex, timeMs: number): SubtitleCue[] {
  const { cues, maxEndPrefix } = index;
  if (cues.length === 0 || !Number.isFinite(timeMs)) {
    return [];
  }

  const rightIdx = findRightmostStartIndex(cues, timeMs);
  if (rightIdx < 0) {
    return [];
  }

  const maxPossibleEnd = maxEndPrefix[rightIdx] ?? -1;
  if (maxPossibleEnd <= timeMs) {
    return [];
  }

  const activeReversed: SubtitleCue[] = [];
  for (let i = rightIdx; i >= 0; i -= 1) {
    if ((maxEndPrefix[i] ?? -1) <= timeMs) {
      break;
    }
    const cue = cues[i];
    if (cue && cue.start <= timeMs && timeMs < cue.end) {
      activeReversed.push(cue);
    }
  }

  activeReversed.reverse();
  return activeReversed;
}

/**
 * Resolves a list of simultaneously active cues within a single track into a
 * single displayable SubtitleCue (combining overlapping lines without losing text).
 */
export function resolveDisplayCue(activeCues: readonly SubtitleCue[]): SubtitleCue | null {
  if (activeCues.length === 0) {
    return null;
  }
  const first = activeCues[0];
  if (!first) {
    return null;
  }
  if (activeCues.length === 1) {
    return first;
  }

  let minStart = first.start;
  let maxEnd = first.end;
  const ids: string[] = [];
  const texts: string[] = [];

  for (const cue of activeCues) {
    if (cue.start < minStart) minStart = cue.start;
    if (cue.end > maxEnd) maxEnd = cue.end;
    ids.push(cue.id);
    if (cue.text.length > 0) {
      texts.push(cue.text);
    }
  }

  return {
    id: ids.join('+'),
    start: minStart,
    end: maxEnd,
    text: texts.join('\n'),
  };
}
