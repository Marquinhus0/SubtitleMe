import { findLanguageDescriptor } from '../config/addon-config';
import { doesContentIdentityMatch, type StremioContentIdentity } from './content-identifier';
import type { MatchConfidence, SubtitleDiscoveryCandidate } from './discovery-types';

export interface BilingualMatchSuccess {
  readonly status: 'matched';
  readonly primary: SubtitleDiscoveryCandidate;
  readonly secondary: SubtitleDiscoveryCandidate;
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

function scoreCandidate(candidate: SubtitleDiscoveryCandidate): number {
  const originBonus = candidate.origin === 'local' ? 1000 : 100;
  const confidenceScore = CONFIDENCE_RANK[candidate.confidence] * 25;
  const hashBonus = candidate.metadata.moviehashMatch === true ? 120 : 0;
  const releaseBonus =
    typeof candidate.metadata.releaseScore === 'number' ? candidate.metadata.releaseScore : 0;
  const downloadsBonus =
    typeof candidate.metadata.downloadCount === 'number'
      ? Math.min(candidate.metadata.downloadCount / 100_000, 9)
      : 0;
  return originBonus + confidenceScore + hashBonus + releaseBonus + downloadsBonus;
}

/**
 * Filters and ranks candidates for a single requested language against a
 * `StremioContentIdentity`.
 *
 * Strict matching criteria:
 * 1. Exact content identity + mediaType + season/episode match (`doesContentIdentityMatch`).
 * 2. Normalized BCP-47 language equivalence.
 * 3. Rejects `'low'` confidence candidates (never does silent low-confidence guessing).
 * 4. Always prioritizes `'local'` candidates ahead of `'external'` candidates.
 */
export function selectBestCandidate(
  identity: StremioContentIdentity,
  requestedLanguage: string,
  candidates: readonly SubtitleDiscoveryCandidate[],
): SubtitleDiscoveryCandidate | null {
  const targetLang = findLanguageDescriptor(requestedLanguage)?.bcp47.toLowerCase();
  if (!targetLang) return null;

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

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  return eligible[0] ?? null;
}

/**
 * Selects a verified primary + secondary bilingual pair.
 *
 * Rules:
 * - Never returns a fake bilingual track if either primary or secondary is missing.
 * - Never duplicates one language into both slots.
 * - Never combines subtitles from different movies or episodes.
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

  const primary = selectBestCandidate(identity, primaryLanguage, primaryCandidates);
  const secondary = selectBestCandidate(identity, secondaryLanguage, secondaryCandidates);

  if (!primary || !secondary) {
    return {
      status: 'incomplete',
      missingPrimary: !primary,
      missingSecondary: !secondary,
      reason:
        !primary && !secondary
          ? `No verified subtitles matched ${identity.canonicalId} for ${primaryLanguage} or ${secondaryLanguage}.`
          : !primary
            ? `Missing verified primary subtitle (${primaryLanguage}) for ${identity.canonicalId}.`
            : `Missing verified secondary subtitle (${secondaryLanguage}) for ${identity.canonicalId}.`,
    };
  }

  return {
    status: 'matched',
    primary,
    secondary,
  };
}
