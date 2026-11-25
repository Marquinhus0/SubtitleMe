import type { SubtitleCue } from '@subtitleme/shared-types';

export interface AutoSyncAlignmentResult {
  readonly cues: SubtitleCue[];
  readonly applied: boolean;
  readonly offsetMs: number;
  readonly scaleFactor: number;
}

const MAX_AUTO_OFFSET_MS = 20_000;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? 0;
  }
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function isDialogueCue(cue: SubtitleCue): boolean {
  const duration = cue.end - cue.start;
  if (duration < 350 || duration > 12_000) return false;
  const lower = cue.text.toLowerCase();
  if (
    lower.includes('opensubtitles') ||
    lower.includes('subtitles by') ||
    lower.includes('traduzido por') ||
    lower.includes('legenda por') ||
    lower.includes('synced by')
  ) {
    return false;
  }
  return cue.text.trim().length >= 2;
}

function computeOverlapScore(
  primary: readonly SubtitleCue[],
  secondary: readonly SubtitleCue[],
  scale: number,
  offsetMs: number,
): number {
  let matched = 0;
  let j = 0;
  for (const p of primary) {
    while (j < secondary.length && (secondary[j]?.end ?? 0) * scale + offsetMs < p.start - 400) {
      j += 1;
    }
    for (let k = j; k < secondary.length; k += 1) {
      const s = secondary[k];
      if (!s) break;
      const sStart = s.start * scale + offsetMs;
      if (sStart > p.end + 400) break;
      if (Math.abs(p.start - sStart) <= 650) {
        matched += 1;
        break;
      }
    }
  }
  return matched;
}

/**
 * Automatically aligns a secondary subtitle track's cue timestamps onto the primary track's
 * dialogue timeline (DualSubs-style cross-language sync), compensating for intro bumper offsets
 * (up to ±20s) and PAL/NTSC framerate drift (`23.976 <-> 25 fps`) when doing so measurably
 * increases cue onset correlation.
 */
export function alignSecondaryCuesToPrimary(
  primaryCues: readonly SubtitleCue[],
  secondaryCues: readonly SubtitleCue[],
): AutoSyncAlignmentResult {
  const pClean = primaryCues.filter(isDialogueCue);
  const sClean = secondaryCues.filter(isDialogueCue);

  if (pClean.length < 8 || sClean.length < 8) {
    return { cues: [...secondaryCues], applied: false, offsetMs: 0, scaleFactor: 1 };
  }

  const baselineScore = computeOverlapScore(pClean, sClean, 1, 0);

  // Candidate framerate ratios: 1.0 (pure offset), PAL->Film (25/23.976), Film->PAL (23.976/25)
  const candidateScales = [1, 25 / 23.976, 23.976 / 25, 24 / 23.976, 23.976 / 24];

  let bestScale = 1;
  let bestOffset = 0;
  let bestScore = baselineScore;

  // Sample up to 60 evenly spaced primary cues to find candidate nearest-neighbor offsets
  const step = Math.max(1, Math.floor(pClean.length / 60));
  const sampledPrimary: SubtitleCue[] = [];
  for (let i = 0; i < pClean.length; i += step) {
    const item = pClean[i];
    if (item) sampledPrimary.push(item);
  }

  for (const scale of candidateScales) {
    const diffs: number[] = [];
    for (const p of sampledPrimary) {
      for (const s of sClean) {
        const sScaled = s.start * scale;
        const diff = p.start - sScaled;
        if (Math.abs(diff) <= MAX_AUTO_OFFSET_MS) {
          diffs.push(diff);
        }
      }
    }

    if (diffs.length < 5) continue;

    // Histogram peak (bin width 250ms) + local median refinement
    const binWidth = 250;
    const bins = new Map<number, number[]>();
    for (const d of diffs) {
      const bucket = Math.round(d / binWidth);
      for (const b of [bucket - 1, bucket, bucket + 1]) {
        const list = bins.get(b) ?? [];
        list.push(d);
        bins.set(b, list);
      }
    }

    let bestCluster: number[] = [];
    for (const cluster of bins.values()) {
      if (cluster.length > bestCluster.length) {
        bestCluster = cluster;
      }
    }
    if (bestCluster.length < 4) continue;

    const candidateOffset = Math.round(median(bestCluster));
    if (Math.abs(candidateOffset) > MAX_AUTO_OFFSET_MS) continue;

    const score = computeOverlapScore(pClean, sClean, scale, candidateOffset);
    // Require meaningful improvement over baseline to avoid touching already-synced tracks
    if (score > bestScore && score >= baselineScore + Math.max(3, Math.floor(pClean.length * 0.06))) {
      bestScore = score;
      bestScale = scale;
      bestOffset = candidateOffset;
    }
  }

  if (bestScale === 1 && Math.abs(bestOffset) < 200) {
    return { cues: [...secondaryCues], applied: false, offsetMs: 0, scaleFactor: 1 };
  }

  const aligned: SubtitleCue[] = [];
  for (const cue of secondaryCues) {
    const start = Math.max(0, Math.round(cue.start * bestScale + bestOffset));
    const end = Math.round(cue.end * bestScale + bestOffset);
    if (end > start) {
      aligned.push({
        id: cue.id,
        start,
        end,
        text: cue.text,
      });
    }
  }

  return {
    cues: aligned,
    applied: true,
    offsetMs: bestOffset,
    scaleFactor: Number(bestScale.toFixed(6)),
  };
}
