import type { SubtitleCue } from '@subtitleme/shared-types';

export interface AutoSyncAlignmentResult {
  readonly cues: SubtitleCue[];
  readonly applied: boolean;
  readonly offsetMs: number;
  readonly scaleFactor: number;
  readonly snappedCount: number;
  readonly syncPercent: number;
}

const MAX_AUTO_OFFSET_MS = 25_000;
const SNAP_TOLERANCE_MS = 380;

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
  if (duration < 300 || duration > 14_000) return false;
  const lower = cue.text.toLowerCase();
  if (
    lower.includes('opensubtitles') ||
    lower.includes('subtitles by') ||
    lower.includes('traduzido por') ||
    lower.includes('legenda por') ||
    lower.includes('synced by') ||
    lower.includes('subtitlesync')
  ) {
    return false;
  }
  return cue.text.trim().length >= 2;
}

function computeOverlapScore(
  anchor: readonly SubtitleCue[],
  target: readonly SubtitleCue[],
  scale: number,
  offsetMs: number,
): number {
  let matched = 0;
  let j = 0;
  for (const a of anchor) {
    while (j < target.length && (target[j]?.end ?? 0) * scale + offsetMs < a.start - 400) {
      j += 1;
    }
    for (let k = j; k < target.length; k += 1) {
      const t = target[k];
      if (!t) break;
      const tStart = t.start * scale + offsetMs;
      if (tStart > a.end + 400) break;
      if (Math.abs(a.start - tStart) <= 550) {
        matched += 1;
        break;
      }
    }
  }
  return matched;
}

/**
 * Computes the percentage (0..100) of anchor dialogue cues that overlap cleanly with target cues,
 * mirroring DualSubs's alignment confidence badge (e.g. `Dual EN+PT-BR 1 (OS/OS) · 92%`).
 */
export function computeCueSyncPercent(
  anchorCues: readonly SubtitleCue[],
  targetCues: readonly SubtitleCue[],
): number {
  const aDialogue = anchorCues.filter(isDialogueCue);
  const tDialogue = targetCues.filter(isDialogueCue);
  const baseA = aDialogue.length > 0 ? aDialogue : anchorCues;
  const baseT = tDialogue.length > 0 ? tDialogue : targetCues;
  if (baseA.length === 0 || baseT.length === 0) return 0;

  let matched = 0;
  let j = 0;
  for (const a of baseA) {
    while (j < baseT.length && (baseT[j]?.end ?? 0) < a.start - 650) {
      j += 1;
    }
    for (let k = j; k < baseT.length; k += 1) {
      const t = baseT[k];
      if (!t) break;
      if (t.start > a.end + 650) break;
      const overlap = Math.min(a.end, t.end) - Math.max(a.start, t.start);
      if (overlap >= 120 || Math.abs(a.start - t.start) <= 600) {
        matched += 1;
        break;
      }
    }
  }

  if (matched === 0) return 0;
  return Math.min(100, Math.max(1, Math.round((matched / baseA.length) * 100)));
}

function refineLinearDrift(
  anchor: readonly SubtitleCue[],
  target: readonly SubtitleCue[],
  initialScale: number,
  initialOffset: number,
): { scale: number; offset: number } | null {
  const pairs: Array<{ x: number; y: number }> = [];
  let j = 0;
  for (const a of anchor) {
    while (j < target.length && (target[j]?.end ?? 0) * initialScale + initialOffset < a.start - 500) {
      j += 1;
    }
    for (let k = j; k < target.length; k += 1) {
      const t = target[k];
      if (!t) break;
      const pred = t.start * initialScale + initialOffset;
      if (pred > a.end + 500) break;
      if (Math.abs(a.start - pred) <= 450) {
        pairs.push({ x: t.start, y: a.start });
        break;
      }
    }
  }

  if (pairs.length < 12) return null;
  const first = pairs[0];
  const last = pairs[pairs.length - 1];
  if (!first || !last || last.x - first.x < 180_000) return null;

  let sumX = 0;
  let sumY = 0;
  for (const p of pairs) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / pairs.length;
  const meanY = sumY / pairs.length;

  let num = 0;
  let den = 0;
  for (const p of pairs) {
    const dx = p.x - meanX;
    num += dx * (p.y - meanY);
    den += dx * dx;
  }
  if (den <= 0) return null;

  const slope = num / den;
  const intercept = meanY - slope * meanX;
  if (slope < 0.95 || slope > 1.05 || Math.abs(intercept) > MAX_AUTO_OFFSET_MS) {
    return null;
  }
  return { scale: slope, offset: Math.round(intercept) };
}

/**
 * Snaps target cue boundaries (`start` / `end`) onto nearby anchor cue boundaries when within
 * `SNAP_TOLERANCE_MS` (`380ms`), eliminating micro-flicker between the two subtitle lines so
 * both languages appear and disappear on the exact same video frame!
 */
export function snapCueBoundariesToAnchor(
  anchorCues: readonly SubtitleCue[],
  targetCues: readonly SubtitleCue[],
  toleranceMs: number = SNAP_TOLERANCE_MS,
): { cues: SubtitleCue[]; snappedCount: number } {
  if (anchorCues.length === 0 || targetCues.length === 0) {
    return { cues: [...targetCues], snappedCount: 0 };
  }

  let snappedCount = 0;
  let j = 0;
  const out: SubtitleCue[] = [];

  for (const t of targetCues) {
    while (j < anchorCues.length && (anchorCues[j]?.end ?? 0) < t.start - toleranceMs) {
      j += 1;
    }

    let bestAnchor: SubtitleCue | null = null;
    let bestStartDiff = toleranceMs + 1;

    for (let k = j; k < anchorCues.length; k += 1) {
      const a = anchorCues[k];
      if (!a) break;
      if (a.start > t.end + toleranceMs) break;
      const sDiff = Math.abs(a.start - t.start);
      if (sDiff <= toleranceMs && sDiff < bestStartDiff) {
        bestStartDiff = sDiff;
        bestAnchor = a;
      }
    }

    let newStart = t.start;
    let newEnd = t.end;

    if (bestAnchor) {
      if (Math.abs(bestAnchor.start - t.start) <= toleranceMs) {
        newStart = bestAnchor.start;
        snappedCount += 1;
      }
      if (Math.abs(bestAnchor.end - t.end) <= toleranceMs && bestAnchor.end > newStart + 200) {
        newEnd = bestAnchor.end;
      }
    }

    if (newEnd > newStart) {
      out.push({
        id: t.id,
        start: newStart,
        end: newEnd,
        text: t.text,
      });
    }
  }

  return { cues: out, snappedCount };
}

/**
 * Aligns `targetCues` onto `anchorCues` using:
 * 1. Multi-scale histogram voting (`1.0`, `25/23.976`, `23.976/25`, `24/23.976`, `23.976/24`)
 * 2. Linear drift refinement across early vs late movie dialogue anchors (RANSAC inliers)
 * 3. Sub-400ms frame boundary snapping (`snapCueBoundariesToAnchor`) for zero-flicker rendering.
 */
export function alignCuesToAnchor(
  anchorCues: readonly SubtitleCue[],
  targetCues: readonly SubtitleCue[],
): AutoSyncAlignmentResult {
  const aClean = anchorCues.filter(isDialogueCue);
  const tClean = targetCues.filter(isDialogueCue);

  if (aClean.length < 8 || tClean.length < 8) {
    const snappedOnly = snapCueBoundariesToAnchor(anchorCues, targetCues);
    return {
      cues: snappedOnly.cues,
      applied: false,
      offsetMs: 0,
      scaleFactor: 1,
      snappedCount: snappedOnly.snappedCount,
      syncPercent: computeCueSyncPercent(anchorCues, snappedOnly.cues),
    };
  }

  const baselineScore = computeOverlapScore(aClean, tClean, 1, 0);
  const candidateScales = [1, 25 / 23.976, 23.976 / 25, 24 / 23.976, 23.976 / 24];

  let bestScale = 1;
  let bestOffset = 0;
  let bestScore = baselineScore;

  const step = Math.max(1, Math.floor(aClean.length / 70));
  const sampledAnchor: SubtitleCue[] = [];
  for (let i = 0; i < aClean.length; i += step) {
    const item = aClean[i];
    if (item) sampledAnchor.push(item);
  }

  for (const scale of candidateScales) {
    const diffs: number[] = [];
    for (const a of sampledAnchor) {
      for (const t of tClean) {
        const tScaled = t.start * scale;
        const diff = a.start - tScaled;
        if (Math.abs(diff) <= MAX_AUTO_OFFSET_MS) {
          diffs.push(diff);
        }
      }
    }

    if (diffs.length < 5) continue;

    const binWidth = 220;
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

    const score = computeOverlapScore(aClean, tClean, scale, candidateOffset);
    if (score > bestScore && score >= baselineScore + Math.max(3, Math.floor(aClean.length * 0.05))) {
      bestScore = score;
      bestScale = scale;
      bestOffset = candidateOffset;
    }
  }

  const refined = refineLinearDrift(aClean, tClean, bestScale, bestOffset);
  if (refined) {
    const refinedScore = computeOverlapScore(aClean, tClean, refined.scale, refined.offset);
    if (refinedScore > bestScore) {
      bestScale = refined.scale;
      bestOffset = refined.offset;
    }
  }

  const shiftedEnough = Math.abs(bestScale - 1) >= 0.00005 || Math.abs(bestOffset) >= 180;
  const transformed: SubtitleCue[] = [];
  for (const cue of targetCues) {
    const start = shiftedEnough ? Math.max(0, Math.round(cue.start * bestScale + bestOffset)) : cue.start;
    const end = shiftedEnough ? Math.round(cue.end * bestScale + bestOffset) : cue.end;
    if (end > start) {
      transformed.push({
        id: cue.id,
        start,
        end,
        text: cue.text,
      });
    }
  }

  const snapped = snapCueBoundariesToAnchor(anchorCues, transformed);

  return {
    cues: snapped.cues,
    applied: shiftedEnough,
    offsetMs: shiftedEnough ? bestOffset : 0,
    scaleFactor: shiftedEnough ? Number(bestScale.toFixed(6)) : 1,
    snappedCount: snapped.snappedCount,
    syncPercent: computeCueSyncPercent(anchorCues, snapped.cues),
  };
}

/** Backward-compatible alias aligning secondary cues onto primary cues. */
export function alignSecondaryCuesToPrimary(
  primaryCues: readonly SubtitleCue[],
  secondaryCues: readonly SubtitleCue[],
): AutoSyncAlignmentResult {
  return alignCuesToAnchor(primaryCues, secondaryCues);
}
