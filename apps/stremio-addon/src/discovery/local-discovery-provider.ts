import type { CompanionSubtitleStore } from '../companion/companion-store';
import { findLanguageDescriptor } from '../config/addon-config';
import { doesContentIdentityMatch, type StremioContentIdentity } from './content-identifier';
import type {
  SubtitleDiscoveryCandidate,
  SubtitleDiscoveryProvider,
} from './discovery-types';

/**
 * Local Discovery Provider backed by `CompanionSubtitleStore`.
 *
 * Guarantees:
 * - Uses explicit content identification (`canonicalId` / `imdbId` + exact `season`/`episode`).
 * - NEVER matches solely on `filename`.
 * - Always produces `'exact'` confidence candidates with `origin: 'local'`.
 * - Respects opt-in persistence, deletion, and cache invalidation transparently.
 */
export class LocalDiscoveryProvider implements SubtitleDiscoveryProvider {
  public readonly name = 'local-companion-discovery';
  public readonly origin = 'local' as const;
  private readonly store: CompanionSubtitleStore;

  public constructor(store: CompanionSubtitleStore) {
    this.store = store;
  }

  public async discover(
    identity: StremioContentIdentity,
    language: string,
  ): Promise<readonly SubtitleDiscoveryCandidate[]> {
    const langDesc = findLanguageDescriptor(language);
    if (!langDesc) return [];

    // Direct fast-path lookup by canonicalId, then fallback to rawId
    const direct =
      this.store.findByContentAndLanguage(identity.canonicalId, langDesc.bcp47) ??
      (identity.rawId !== identity.canonicalId
        ? this.store.findByContentAndLanguage(identity.rawId, langDesc.bcp47)
        : null);

    if (!direct) return [];

    // Enforce strict content/episode equivalence check
    if (
      !doesContentIdentityMatch(identity, {
        contentId: direct.contentId,
        mediaType: identity.mediaType,
      })
    ) {
      return [];
    }

    const candidate: SubtitleDiscoveryCandidate = {
      candidateId: `local:${direct.id}`,
      providerName: this.name,
      origin: 'local',
      language: direct.language,
      format: direct.format,
      contentId: direct.contentId,
      mediaType: identity.mediaType,
      ...(identity.season !== undefined ? { season: identity.season } : {}),
      ...(identity.episode !== undefined ? { episode: identity.episode } : {}),
      confidence: 'exact',
      matchReason: `Explicit local Companion association for "${direct.contentId}" (${direct.language}).`,
      metadata: {
        filename: direct.filename,
      },
      async loadAsset() {
        return {
          sourceId: direct.id,
          language: direct.language,
          format: direct.format,
          content: direct.content,
        };
      },
    };

    return [candidate];
  }
}
