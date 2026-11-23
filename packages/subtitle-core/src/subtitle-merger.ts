import type {
  SubtitleCue,
  SubtitleFormat,
  SubtitleOrder,
  SubtitleTrack,
} from '@subtitleme/shared-types';
import { buildCueIndex, findActiveCues } from './cue-index';

export interface SubtitleMergeOptions {
  outputFormat?: SubtitleFormat;
  separator?: string;
  order?: SubtitleOrder;
  /** Avoid emitting duplicate identical lines when both tracks contain the same text. Defaults to true. */
  deduplicateIdenticalLines?: boolean;
}

export interface SubtitleMerger {
  merge(
    primary: SubtitleTrack,
    secondary: SubtitleTrack,
    options?: SubtitleMergeOptions,
  ): SubtitleCue[];
  mergeToString(
    primary: SubtitleTrack,
    secondary: SubtitleTrack,
    options?: SubtitleMergeOptions & { outputFormat: SubtitleFormat },
  ): string;
}

function applyTrackOffset(track: SubtitleTrack): SubtitleCue[] {
  if (!track.enabled || track.cues.length === 0) {
    return [];
  }

  const offset = Number.isFinite(track.offset) ? Math.round(track.offset) : 0;
  const shifted: SubtitleCue[] = [];

  for (const cue of track.cues) {
    const start = Math.max(0, cue.start + offset);
    const end = cue.end + offset;
    if (end <= start) continue;
    const text = cue.text.trim();
    if (text.length === 0) continue;
    shifted.push({
      id: cue.id,
      start,
      end,
      text,
    });
  }

  return shifted;
}

function formatMs(ms: number, format: SubtitleFormat): string {
  const totalMs = Math.max(0, Math.round(ms));
  const milliseconds = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const sep = format === 'srt' ? ',' : '.';
  return (
    `${String(hours).padStart(2, '0')}:` +
    `${String(minutes).padStart(2, '0')}:` +
    `${String(seconds).padStart(2, '0')}${sep}` +
    `${String(milliseconds).padStart(3, '0')}`
  );
}

/**
 * Serializes normalized SubtitleCues into a valid WebVTT or SRT document.
 * Designed for dual-subtitle export and future Stremio Addon subtitle responses.
 */
export function serializeSubtitleCues(
  cues: readonly SubtitleCue[],
  format: SubtitleFormat,
): string {
  const blocks = cues.map((cue, index) => {
    const id = cue.id || String(index + 1);
    const timing = `${formatMs(cue.start, format)} --> ${formatMs(cue.end, format)}`;
    return `${id}\n${timing}\n${cue.text}`;
  });

  if (format === 'vtt') {
    return blocks.length > 0 ? `WEBVTT\n\n${blocks.join('\n\n')}\n` : 'WEBVTT\n';
  }

  return blocks.length > 0 ? `${blocks.join('\n\n')}\n` : '';
}

/**
 * Combines two independently timed subtitle tracks into a single chronological
 * timeline using boundary-union segmentation:
 * 1. Applies each track's independent offset.
 * 2. Collects the sorted union of all cue start/end timestamps.
 * 3. Evaluates active cues on every elementary interval `[t_k, t_{k+1})`.
 * 4. Coalesces contiguous identical intervals to keep output compact.
 */
export function mergeSubtitleTracks(
  primary: SubtitleTrack,
  secondary: SubtitleTrack,
  options: SubtitleMergeOptions = {},
): SubtitleCue[] {
  const separator = options.separator ?? '\n';
  const order: SubtitleOrder = options.order ?? 'primary-top';
  const deduplicate = options.deduplicateIdenticalLines ?? true;

  const shiftedPrimary = applyTrackOffset(primary);
  const shiftedSecondary = applyTrackOffset(secondary);

  if (shiftedPrimary.length === 0 && shiftedSecondary.length === 0) {
    return [];
  }

  const primaryIndex = buildCueIndex(shiftedPrimary);
  const secondaryIndex = buildCueIndex(shiftedSecondary);

  const boundarySet = new Set<number>();
  for (const cue of shiftedPrimary) {
    boundarySet.add(cue.start);
    boundarySet.add(cue.end);
  }
  for (const cue of shiftedSecondary) {
    boundarySet.add(cue.start);
    boundarySet.add(cue.end);
  }

  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  const merged: SubtitleCue[] = [];

  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const segStart = boundaries[i];
    const segEnd = boundaries[i + 1];
    if (segStart === undefined || segEnd === undefined || segEnd <= segStart) {
      continue;
    }

    const activePrimary = findActiveCues(primaryIndex, segStart);
    const activeSecondary = findActiveCues(secondaryIndex, segStart);

    if (activePrimary.length === 0 && activeSecondary.length === 0) {
      continue;
    }

    const orderedGroups =
      order === 'secondary-top'
        ? [activeSecondary, activePrimary]
        : [activePrimary, activeSecondary];

    const parts: string[] = [];
    for (const group of orderedGroups) {
      for (const cue of group) {
        if (!cue.text) continue;
        if (deduplicate && parts.includes(cue.text)) {
          continue;
        }
        parts.push(cue.text);
      }
    }

    if (parts.length === 0) {
      continue;
    }

    const combinedText = parts.join(separator);
    const previous = merged[merged.length - 1];
    if (previous && previous.end === segStart && previous.text === combinedText) {
      previous.end = segEnd;
    } else {
      merged.push({
        id: String(merged.length + 1),
        start: segStart,
        end: segEnd,
        text: combinedText,
      });
    }
  }

  return merged;
}

export function createSubtitleMerger(): SubtitleMerger {
  return {
    merge(primary, secondary, options) {
      return mergeSubtitleTracks(primary, secondary, options);
    },
    mergeToString(primary, secondary, options) {
      const cues = mergeSubtitleTracks(primary, secondary, options);
      return serializeSubtitleCues(cues, options?.outputFormat ?? 'vtt');
    },
  };
}
