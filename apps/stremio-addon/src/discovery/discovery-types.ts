import type { SubtitleFormat } from '@subtitleme/shared-types';
import type { RawSubtitleAsset } from '../sources/subtitle-source.interface';
import type { StremioContentType } from '../types/stremio';
import type { StremioContentIdentity } from './content-identifier';

export type DiscoverySourceOrigin = 'local' | 'external';
export type MatchConfidence = 'exact' | 'high' | 'low';

export interface SubtitleDiscoveryCandidate {
  readonly candidateId: string;
  readonly providerName: string;
  readonly origin: DiscoverySourceOrigin;
  /** Normalized BCP-47 language tag (e.g. `en`, `pt-BR`). */
  readonly language: string;
  readonly format: SubtitleFormat;
  /** Content ID associated with this candidate. */
  readonly contentId: string;
  readonly mediaType?: StremioContentType;
  readonly season?: number;
  readonly episode?: number;
  /** Explicit confidence classification — `'low'` candidates are rejected by the matcher. */
  readonly confidence: MatchConfidence;
  /** Human-readable explanation of why this candidate was returned. */
  readonly matchReason: string;
  readonly metadata: {
    readonly filename?: string;
    readonly fileId?: number;
    readonly releaseName?: string;
    readonly downloadCount?: number;
  };
  /** Lazy loader to fetch/materialize raw subtitle bytes only after matching selects this candidate. */
  loadAsset(): Promise<RawSubtitleAsset | null>;
}

/**
 * Independent discovery contract separating subtitle discovery from download,
 * validation, parsing, merging, caching, and VTT delivery.
 */
export interface SubtitleDiscoveryProvider {
  readonly name: string;
  readonly origin: DiscoverySourceOrigin;
  discover(
    identity: StremioContentIdentity,
    language: string,
  ): Promise<readonly SubtitleDiscoveryCandidate[]>;
}
