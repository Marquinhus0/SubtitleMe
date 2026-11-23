import { findLanguageDescriptor } from '../config/addon-config';
import { validateAddonConfig } from '../config/config-validator';
import type { SubtitleFileService } from '../delivery/subtitle-file-service';
import type { SubtitleSourceProvider } from '../sources/subtitle-source.interface';
import type {
  StremioSubtitlesRequest,
  StremioSubtitlesResponse,
} from '../types/stremio';

export interface SubtitlesHandlerDeps {
  sourceProvider: SubtitleSourceProvider;
  fileService: SubtitleFileService;
  cacheMaxAgeSeconds?: number;
}

/**
 * Builds the `defineSubtitlesHandler` callback for the official Stremio Addon SDK.
 * Validates request parameters and user config, fetches both tracks from the
 * configured SubtitleSourceProvider, merges them into WebVTT via SubtitleFileService,
 * and returns a protocol-compliant Subtitles Object (`id`, `url`, `lang`, `label`).
 */
export function createSubtitlesHandler(deps: SubtitlesHandlerDeps) {
  const cacheMaxAge = deps.cacheMaxAgeSeconds ?? 300;

  return async function handleSubtitlesRequest(
    args: StremioSubtitlesRequest,
  ): Promise<StremioSubtitlesResponse> {
    if (!args || typeof args.id !== 'string' || args.id.trim().length === 0) {
      return { subtitles: [] };
    }

    const validation = validateAddonConfig(args.config);
    if (!validation.valid || !validation.config.bilingualEnabled) {
      return { subtitles: [] };
    }

    const { config } = validation;
    const baseQuery = {
      type: args.type,
      videoId: args.id.trim(),
      ...(args.extra?.videoHash !== undefined ? { videoHash: args.extra.videoHash } : {}),
      ...(args.extra?.videoSize !== undefined ? { videoSize: args.extra.videoSize } : {}),
      ...(args.extra?.filename !== undefined ? { filename: args.extra.filename } : {}),
    };

    try {
      const [primaryAsset, secondaryAsset] = await Promise.all([
        deps.sourceProvider.fetchSubtitle({
          ...baseQuery,
          language: config.primaryLanguage,
        }),
        deps.sourceProvider.fetchSubtitle({
          ...baseQuery,
          language: config.secondaryLanguage,
        }),
      ]);

      if (!primaryAsset || !secondaryAsset) {
        return { subtitles: [] };
      }

      const delivery = deps.fileService.generateCombinedVtt(
        baseQuery.videoId,
        primaryAsset,
        secondaryAsset,
        config,
      );

      const primaryDesc = findLanguageDescriptor(config.primaryLanguage);
      const secondaryDesc = findLanguageDescriptor(config.secondaryLanguage);
      const primaryLabel = primaryDesc?.label ?? config.primaryLanguage;
      const secondaryLabel = secondaryDesc?.label ?? config.secondaryLanguage;

      return {
        subtitles: [
          {
            id: `subtitleme-${delivery.token}`,
            url: delivery.url,
            // ISO 639-2 code of primary language per Stremio Subtitles Object spec
            lang: primaryDesc?.iso639_2 ?? 'eng',
            label: `SubtitleMe — ${primaryLabel} + ${secondaryLabel}`,
          },
        ],
        cacheMaxAge,
      };
    } catch {
      // Never crash the Stremio handler on upstream source or parse failure
      return { subtitles: [] };
    }
  };
}
