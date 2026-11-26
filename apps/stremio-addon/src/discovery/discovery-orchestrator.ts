import type { SubtitleSourcePreference } from '../config/addon-config';
import type { RawSubtitleAsset } from '../sources/subtitle-source.interface';
import type { StremioContentIdentity } from './content-identifier';
import type {
  SubtitleDiscoveryCandidate,
  SubtitleDiscoveryProvider,
} from './discovery-types';
import {
  computeVideoSyncRank,
  filterCandidatesBySourcePreference,
  matchBilingualPair,
  rankEligibleCandidates,
  selectRankedCandidatePairs,
  type BilingualMatchResult,
} from './subtitle-matcher';

export interface ResolvedBilingualPairItem {
  readonly primaryAsset: RawSubtitleAsset;
  readonly secondaryAsset: RawSubtitleAsset;
  readonly primaryProvider: string;
  readonly secondaryProvider: string;
  readonly syncAnchor: 'primary' | 'secondary';
}

export interface MultiPairResolutionResult {
  readonly status: 'resolved' | 'incomplete';
  readonly identity: StremioContentIdentity;
  readonly pairs: readonly ResolvedBilingualPairItem[];
  readonly missingPrimary: boolean;
  readonly missingSecondary: boolean;
}

export interface DiscoveryResolutionResult {
  readonly status: 'resolved' | 'incomplete';
  readonly identity: StremioContentIdentity;
  readonly match: BilingualMatchResult;
  readonly primaryAsset?: RawSubtitleAsset;
  readonly secondaryAsset?: RawSubtitleAsset;
  readonly primaryProvider?: string;
  readonly secondaryProvider?: string;
  /** Which track has stronger lock to the playing video timeline ('primary' | 'secondary'). */
  readonly syncAnchor?: 'primary' | 'secondary';
}

async function loadFirstAvailable(
  candidates: readonly SubtitleDiscoveryCandidate[],
): Promise<{ asset: RawSubtitleAsset; candidate: SubtitleDiscoveryCandidate } | null> {
  for (const candidate of candidates.slice(0, 4)) {
    try {
      const asset = await candidate.loadAsset();
      if (asset && asset.content.trim().length > 0) {
        return { asset, candidate };
      }
    } catch {
      // Try next fallback candidate (e.g. if OpenSubtitles v1 quota is exhausted, falls back to v3)
    }
  }
  return null;
}

/**
 * Orchestrates subtitle discovery across all configured `SubtitleDiscoveryProvider`s,
 * applies co-release & sync-rank matching, and automatically retries fallback candidates
 * if an upstream download fails or hits rate/quota limits.
 */
export class SubtitleDiscoveryOrchestrator {
  private readonly providers: readonly SubtitleDiscoveryProvider[];

  public constructor(providers: readonly SubtitleDiscoveryProvider[]) {
    this.providers = [...providers];
  }

  public getProviders(): readonly SubtitleDiscoveryProvider[] {
    return this.providers;
  }

  private async discoverForLanguage(
    identity: StremioContentIdentity,
    language: string,
  ): Promise<SubtitleDiscoveryCandidate[]> {
    const settled = await Promise.allSettled(
      this.providers.map((provider) => provider.discover(identity, language)),
    );

    const allCandidates: SubtitleDiscoveryCandidate[] = [];
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        allCandidates.push(...outcome.value);
      }
    }
    return allCandidates;
  }

  public async resolveBilingualAssets(
    identity: StremioContentIdentity,
    primaryLanguage: string,
    secondaryLanguage: string,
  ): Promise<DiscoveryResolutionResult> {
    const [primaryCandidates, secondaryCandidates] = await Promise.all([
      this.discoverForLanguage(identity, primaryLanguage),
      this.discoverForLanguage(identity, secondaryLanguage),
    ]);

    const match = matchBilingualPair(
      identity,
      primaryLanguage,
      secondaryLanguage,
      primaryCandidates,
      secondaryCandidates,
    );

    if (match.status !== 'matched') {
      return {
        status: 'incomplete',
        identity,
        match,
      };
    }

    const [loadedPrimary, loadedSecondary] = await Promise.all([
      loadFirstAvailable(match.primaryRanked),
      loadFirstAvailable(match.secondaryRanked),
    ]);

    if (!loadedPrimary || !loadedSecondary) {
      return {
        status: 'incomplete',
        identity,
        match: {
          status: 'incomplete',
          missingPrimary: !loadedPrimary,
          missingSecondary: !loadedSecondary,
          reason: 'Matched candidate asset could not be loaded.',
        },
      };
    }

    const pRank = computeVideoSyncRank(loadedPrimary.candidate);
    const sRank = computeVideoSyncRank(loadedSecondary.candidate);
    const syncAnchor: 'primary' | 'secondary' = sRank > pRank ? 'secondary' : 'primary';

    return {
      status: 'resolved',
      identity,
      match,
      primaryAsset: loadedPrimary.asset,
      secondaryAsset: loadedSecondary.asset,
      primaryProvider: loadedPrimary.candidate.providerName,
      secondaryProvider: loadedSecondary.candidate.providerName,
      syncAnchor,
    };
  }

  /**
   * Resolves up to `maxPairs` (1..5) ranked bilingual subtitle pairs while respecting
   * per-language source preferences (`auto` | `sync` | `os`) and deduplicating downloads.
   */
  public async resolveMultipleBilingualPairs(
    identity: StremioContentIdentity,
    primaryLanguage: string,
    secondaryLanguage: string,
    options: {
      maxPairs?: number;
      primarySrc?: SubtitleSourcePreference;
      secondarySrc?: SubtitleSourcePreference;
    } = {},
  ): Promise<MultiPairResolutionResult> {
    const [rawPrimary, rawSecondary] = await Promise.all([
      this.discoverForLanguage(identity, primaryLanguage),
      this.discoverForLanguage(identity, secondaryLanguage),
    ]);

    const filteredP = filterCandidatesBySourcePreference(rawPrimary, options.primarySrc);
    const filteredS = filterCandidatesBySourcePreference(rawSecondary, options.secondarySrc);

    const pRanked = rankEligibleCandidates(identity, primaryLanguage, filteredP);
    const sRanked = rankEligibleCandidates(identity, secondaryLanguage, filteredS);

    if (pRanked.length === 0 || sRanked.length === 0) {
      return {
        status: 'incomplete',
        identity,
        pairs: [],
        missingPrimary: pRanked.length === 0,
        missingSecondary: sRanked.length === 0,
      };
    }

    const desiredCount = Math.min(5, Math.max(1, options.maxPairs ?? 3));
    // Request a small buffer of candidate pairs in case one upstream download fails
    const candidatePairs = selectRankedCandidatePairs(pRanked, sRanked, Math.min(5, desiredCount + 1));

    const loadCache = new Map<string, Promise<RawSubtitleAsset | null>>();
    const loadOnce = (candidate: SubtitleDiscoveryCandidate): Promise<RawSubtitleAsset | null> => {
      const existing = loadCache.get(candidate.candidateId);
      if (existing) return existing;
      const promise = candidate
        .loadAsset()
        .then((asset) => (asset && asset.content.trim().length > 0 ? asset : null))
        .catch(() => null);
      loadCache.set(candidate.candidateId, promise);
      return promise;
    };

    const resolvedPairs: ResolvedBilingualPairItem[] = [];
    for (const pair of candidatePairs) {
      if (resolvedPairs.length >= desiredCount) break;
      const [pAsset, sAsset] = await Promise.all([
        loadOnce(pair.primary),
        loadOnce(pair.secondary),
      ]);
      if (!pAsset || !sAsset) continue;

      const pRank = computeVideoSyncRank(pair.primary);
      const sRank = computeVideoSyncRank(pair.secondary);
      resolvedPairs.push({
        primaryAsset: pAsset,
        secondaryAsset: sAsset,
        primaryProvider: pair.primary.providerName,
        secondaryProvider: pair.secondary.providerName,
        syncAnchor: sRank > pRank ? 'secondary' : 'primary',
      });
    }

    if (resolvedPairs.length === 0) {
      return {
        status: 'incomplete',
        identity,
        pairs: [],
        missingPrimary: true,
        missingSecondary: true,
      };
    }

    return {
      status: 'resolved',
      identity,
      pairs: resolvedPairs,
      missingPrimary: false,
      missingSecondary: false,
    };
  }
}
