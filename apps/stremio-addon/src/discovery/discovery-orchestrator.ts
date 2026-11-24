import type { RawSubtitleAsset } from '../sources/subtitle-source.interface';
import type { StremioContentIdentity } from './content-identifier';
import type {
  SubtitleDiscoveryCandidate,
  SubtitleDiscoveryProvider,
} from './discovery-types';
import { matchBilingualPair, type BilingualMatchResult } from './subtitle-matcher';

export interface DiscoveryResolutionResult {
  readonly status: 'resolved' | 'incomplete';
  readonly identity: StremioContentIdentity;
  readonly match: BilingualMatchResult;
  readonly primaryAsset?: RawSubtitleAsset;
  readonly secondaryAsset?: RawSubtitleAsset;
  readonly primaryProvider?: string;
  readonly secondaryProvider?: string;
}

/**
 * Orchestrates subtitle discovery across all configured `SubtitleDiscoveryProvider`s,
 * applies strict `matchBilingualPair` selection, and materializes raw subtitle assets
 * only after both primary and secondary candidates pass matching.
 *
 * Isolates provider failures: a throwing external provider never breaks local discovery.
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

    const [primaryAsset, secondaryAsset] = await Promise.all([
      match.primary.loadAsset().catch(() => null),
      match.secondary.loadAsset().catch(() => null),
    ]);

    if (!primaryAsset || !secondaryAsset) {
      return {
        status: 'incomplete',
        identity,
        match: {
          status: 'incomplete',
          missingPrimary: !primaryAsset,
          missingSecondary: !secondaryAsset,
          reason: 'Matched candidate asset could not be loaded.',
        },
      };
    }

    return {
      status: 'resolved',
      identity,
      match,
      primaryAsset,
      secondaryAsset,
      primaryProvider: match.primary.providerName,
      secondaryProvider: match.secondary.providerName,
    };
  }
}
