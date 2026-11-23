import type {
  RawSubtitleAsset,
  SubtitleSourceProvider,
  SubtitleSourceQuery,
} from './subtitle-source.interface';

export type SubtitleResolutionOrigin = 'local' | 'external' | 'none';

export interface CompositeSourceOptions {
  readonly localProvider: SubtitleSourceProvider;
  readonly externalProvider?: SubtitleSourceProvider;
  /** External fallback is strictly opt-in (defaults to false). */
  readonly externalFallbackEnabled?: boolean;
}

export interface LastResolutionInfo {
  readonly videoId: string;
  readonly language: string;
  readonly origin: SubtitleResolutionOrigin;
  readonly providerName: string;
}

/**
 * Source selection and fallback policy provider:
 *
 * 1. Always queries `localProvider` (`LocalFileSubtitleSource`) first.
 * 2. If a local track exists for `(videoId, language)`, returns it immediately —
 *    NEVER overwrites a local user subtitle with an external source.
 * 3. Only if local returns `null` AND `externalFallbackEnabled === true` AND an
 *    `externalProvider` is configured, queries the external provider with the exact
 *    same `videoId` and `language`.
 * 4. Never mixes subtitles from different `videoId`s.
 */
export class CompositeSubtitleSource implements SubtitleSourceProvider {
  public readonly name = 'composite-local-first';

  private readonly localProvider: SubtitleSourceProvider;
  private readonly externalProvider: SubtitleSourceProvider | undefined;
  private readonly externalFallbackEnabled: boolean;
  private lastResolution: LastResolutionInfo | null = null;

  public constructor(options: CompositeSourceOptions) {
    this.localProvider = options.localProvider;
    this.externalProvider = options.externalProvider;
    this.externalFallbackEnabled = options.externalFallbackEnabled === true;
  }

  public getLastResolution(): LastResolutionInfo | null {
    return this.lastResolution;
  }

  public async fetchSubtitle(query: SubtitleSourceQuery): Promise<RawSubtitleAsset | null> {
    const localAsset = await this.localProvider.fetchSubtitle(query);
    if (localAsset) {
      this.lastResolution = {
        videoId: query.videoId,
        language: query.language,
        origin: 'local',
        providerName: this.localProvider.name,
      };
      return localAsset;
    }

    if (this.externalFallbackEnabled && this.externalProvider) {
      const externalAsset = await this.externalProvider.fetchSubtitle(query);
      if (externalAsset) {
        this.lastResolution = {
          videoId: query.videoId,
          language: query.language,
          origin: 'external',
          providerName: this.externalProvider.name,
        };
        return externalAsset;
      }
    }

    this.lastResolution = {
      videoId: query.videoId,
      language: query.language,
      origin: 'none',
      providerName: this.name,
    };
    return null;
  }
}
