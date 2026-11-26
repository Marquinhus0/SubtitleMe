import { findLanguageDescriptor, type SubtitleSourcePreference } from '../config/addon-config';
import { doesContentIdentityMatch, type StremioContentIdentity } from './content-identifier';
import type { MatchConfidence, SubtitleDiscoveryCandidate } from './discovery-types';
import { computeReleaseSimilarity } from './release-similarity';

export interface RankedCandidatePair {
  readonly primary: SubtitleDiscoveryCandidate;
  readonly secondary: SubtitleDiscoveryCandidate;
  readonly score: number;
}

export interface BilingualMatchSuccess {
  readonly status: 'matched';
  readonly primary: SubtitleDiscoveryCandidate;
  readonly secondary: SubtitleDiscoveryCandidate;
  readonly primaryRanked: readonly SubtitleDiscoveryCandidate[];
  readonly secondaryRanked: readonly SubtitleDiscoveryCandidate[];
}

export interface BilingualMatchIncomplete {
  readonly status: 'incomplete';
  readonly missingPrimary: boolean;
  readonly missingSecondary: boolean;
  readonly reason: string;
}

export type BilingualMatchResult = BilingualMatchSuccess | BilingualMatchIncomplete;

const CONFIDENCE_RANK: Record<MatchConfidence, number> = {
  exact: 3,
  high: 2,
  low: 0,
};

export function computeVideoSyncRank(candidate: SubtitleDiscoveryCandidate): number {
  if (candidate.origin === 'local' || candidate.metadata.syncedByAddon === true) {
    return 3;
  }
  if (candidate.metadata.moviehashMatch === true) {
    return 2;
  }
  if ((candidate.metadata.releaseScore ?? 0) >= 35) {
    return 1;
  }
  return 0;
}

function scoreCandidate(candidate: SubtitleDiscoveryCandidate): number {
  const originBonus = candidate.origin === 'local' ? 1000 : 100;
  const syncAddonBonus = candidate.metadata.syncedByAddon === true ? 160 : 0;
  const hashBonus = candidate.metadata.moviehashMatch === true ? 130 : 0;
  // Prefer quota-free unlimited v3 ahead of quota-limited v1 when sync quality is equal
  const quotaSaverBonus = candidate.providerName === 'stremio-opensubtitles-v3' ? 12 : 0;
  const confidenceScore = CONFIDENCE_RANK[candidate.confidence] * 25;
  const releaseBonus =
    typeof candidate.metadata.releaseScore === 'number' ? candidate.metadata.releaseScore : 0;
  const downloadsBonus =
    typeof candidate.metadata.downloadCount === 'number'
      ? Math.min(candidate.metadata.downloadCount / 100_000, 9)
      : 0;
  return (
    originBonus +
    syncAddonBonus +
    hashBonus +
    quotaSaverBonus +
    confidenceScore +
    releaseBonus +
    downloadsBonus
  );
}

export function rankEligibleCandidates(
  identity: StremioContentIdentity,
  requestedLanguage: string,
  candidates: readonly SubtitleDiscoveryCandidate[],
): SubtitleDiscoveryCandidate[] {
  const targetLang = findLanguageDescriptor(requestedLanguage)?.bcp47.toLowerCase();
  if (!targetLang) return [];

  const eligible = candidates.filter((candidate) => {
    if (candidate.confidence === 'low') return false;
    const candidateLang = findLanguageDescriptor(candidate.language)?.bcp47.toLowerCase();
    if (candidateLang !== targetLang) return false;
    return doesContentIdentityMatch(identity, {
      contentId: candidate.contentId,
      ...(candidate.mediaType !== undefined ? { mediaType: candidate.mediaType } : {}),
      ...(candidate.season !== undefined ? { season: candidate.season } : {}),
      ...(candidate.episode !== undefined ? { episode: candidate.episode } : {}),
    });
  });

  eligible.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  return eligible;
}

export function selectBestCandidate(
  identity: StremioContentIdentity,
  requestedLanguage: string,
  candidates: readonly SubtitleDiscoveryCandidate[],
): SubtitleDiscoveryCandidate | null {
  return rankEligibleCandidates(identity, requestedLanguage, candidates)[0] ?? null;
}

export function filterCandidatesBySourcePreference(
  candidates: readonly SubtitleDiscoveryCandidate[],
  preference: SubtitleSourcePreference | undefined,
): SubtitleDiscoveryCandidate[] {
  if (!preference || preference === 'auto') {
    return [...candidates];
  }
  return candidates.filter((candidate) => {
    if (candidate.origin === 'local') return true;
    if (preference === 'sync') {
      return candidate.providerName === 'subtitle-sync-addon';
    }
    return (
      candidate.providerName === 'stremio-opensubtitles-v3' ||
      candidate.providerName === 'opensubtitles-rest-v1-discovery'
    );
  });
}

/**
 * Builds up to `maxPairs` (1..5) distinct, release-matched `(primary, secondary)` candidate pairs
 * mimicking DualSubs's multi-option Stremio menu (`Dual EN+PT-BR 1`, `2`, `3`...).
 */
export function selectRankedCandidatePairs(
  pRanked: readonly SubtitleDiscoveryCandidate[],
  sRanked: readonly SubtitleDiscoveryCandidate[],
  maxPairs: number,
): RankedCandidatePair[] {
  if (pRanked.length === 0 || sRanked.length === 0 || maxPairs < 1) {
    return [];
  }

  const limit = Math.min(5, Math.max(1, Math.round(maxPairs)));
  const topP = pRanked.slice(0, 6);
  const topS = sRanked.slice(0, 6);

  const allCombos: RankedCandidatePair[] = [];
  for (const p of topP) {
    for (const s of topS) {
      const pRel = p.metadata.releaseName ?? p.metadata.filename;
      const sRel = s.metadata.releaseName ?? s.metadata.filename;
      const coReleaseBonus =
        pRel && sRel ? Math.max(0, computeReleaseSimilarity(pRel, sRel)) * 0.65 : 0;
      allCombos.push({
        primary: p,
        secondary: s,
        score: scoreCandidate(p) + scoreCandidate(s) + coReleaseBonus,
      });
    }
  }

  allCombos.sort((a, b) => b.score - a.score);

  const selected: RankedCandidatePair[] = [];
  const usedPairs = new Set<string>();
  const usedP = new Set<string>();
  const usedS = new Set<string>();

  // Pass 1: prefer completely distinct primary AND secondary releases (e.g. WEB-DL pair, BluRay pair)
  for (const combo of allCombos) {
    if (selected.length >= limit) break;
    const key = `${combo.primary.candidateId}|${combo.secondary.candidateId}`;
    if (usedPairs.has(key)) continue;
    if (!usedP.has(combo.primary.candidateId) && !usedS.has(combo.secondary.candidateId)) {
      selected.push(combo);
      usedPairs.add(key);
      usedP.add(combo.primary.candidateId);
      usedS.add(combo.secondary.candidateId);
    }
  }

  // Pass 2: fill remaining requested slots with distinct (primary, secondary) combinations
  for (const combo of allCombos) {
    if (selected.length >= limit) break;
    const key = `${combo.primary.candidateId}|${combo.secondary.candidateId}`;
    if (usedPairs.has(key)) continue;
    selected.push(combo);
    usedPairs.add(key);
  }

  return selected;
}

/**
 * Selects a verified primary + secondary bilingual pair, applying co-release pairing
 * so that when one track is anchored to a specific release (or neither has a video filename),
 * the companion track prefers the exact same release cut (e.g. both YIFY/BrRip or both WEB-DL).
 */
export function matchBilingualPair(
  identity: StremioContentIdentity,
  primaryLanguage: string,
  secondaryLanguage: string,
  primaryCandidates: readonly SubtitleDiscoveryCandidate[],
  secondaryCandidates: readonly SubtitleDiscoveryCandidate[],
): BilingualMatchResult {
  const primaryLang = findLanguageDescriptor(primaryLanguage)?.bcp47.toLowerCase();
  const secondaryLang = findLanguageDescriptor(secondaryLanguage)?.bcp47.toLowerCase();
  if (!primaryLang || !secondaryLang || primaryLang === secondaryLang) {
    return {
      status: 'incomplete',
      missingPrimary: true,
      missingSecondary: true,
      reason: 'Primary and secondary languages must be valid and distinct.',
    };
  }

  const pRanked = rankEligibleCandidates(identity, primaryLanguage, primaryCandidates);
  const sRanked = rankEligibleCandidates(identity, secondaryLanguage, secondaryCandidates);

  const firstP = pRanked[0];
  const firstS = sRanked[0];
  if (!firstP || !firstS) {
    return {
      status: 'incomplete',
      missingPrimary: !firstP,
      missingSecondary: !firstS,
      reason:
        !firstP && !firstS
          ? `No verified subtitles matched ${identity.canonicalId} for ${primaryLanguage} or ${secondaryLanguage}.`
          : !firstP
            ? `Missing verified primary subtitle (${primaryLanguage}) for ${identity.canonicalId}.`
            : `Missing verified secondary subtitle (${secondaryLanguage}) for ${identity.canonicalId}.`,
    };
  }

  // Co-release optimization among top 5 primary x top 5 secondary candidates
  let bestPair = { p: firstP, s: firstS, total: -Infinity };
  const topP = pRanked.slice(0, 5);
  const topS = sRanked.slice(0, 5);

  for (const p of topP) {
    for (const s of topS) {
      const pRel = p.metadata.releaseName ?? p.metadata.filename;
      const sRel = s.metadata.releaseName ?? s.metadata.filename;
      const coReleaseBonus =
        pRel && sRel ? Math.max(0, computeReleaseSimilarity(pRel, sRel)) * 0.65 : 0;
      const total = scoreCandidate(p) + scoreCandidate(s) + coReleaseBonus;
      if (total > bestPair.total) {
        bestPair = { p, s, total };
      }
    }
  }

  // Reorder ranked lists so chosen best pair is index 0, keeping remaining fallbacks in order
  const orderedP = [bestPair.p, ...pRanked.filter((c) => c !== bestPair.p)];
  const orderedS = [bestPair.s, ...sRanked.filter((c) => c !== bestPair.s)];

  return {
    status: 'matched',
    primary: bestPair.p,
    secondary: bestPair.s,
    primaryRanked: orderedP,
    secondaryRanked: orderedS,
  };
}
