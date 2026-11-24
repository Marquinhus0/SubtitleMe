import { findLanguageDescriptor } from '../config/addon-config';
import { validateAddonConfig } from '../config/config-validator';
import type { SubtitleFileService } from '../delivery/subtitle-file-service';
import { parseStremioContentId } from '../discovery/content-identifier';
import type { SubtitleDiscoveryOrchestrator } from '../discovery/discovery-orchestrator';
import type { RawSubtitleAsset, SubtitleSourceProvider } from '../sources/subtitle-source.interface';
import type {
  StremioSubtitlesRequest,
  StremioSubtitlesResponse,
} from '../types/stremio';

export interface SubtitlesHandlerDeps {
  sourceProvider?: SubtitleSourceProvider;
  discoveryOrchestrator?: SubtitleDiscoveryOrchestrator;
  fileService: SubtitleFileService;
  cacheMaxAgeSeconds?: number;
}

/**
 * Builds the `defineSubtitlesHandler` callback for the official Stremio Addon SDK.
 * Parses the Stremio content identity (movie or series episode), validates user config,
 * discovers & matches both tracks via `SubtitleDiscoveryOrchestrator` (or legacy
 * `SubtitleSourceProvider`), merges them into WebVTT via `SubtitleFileService`,
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

    const identity = parseStremioContentId({
      type: args.type,
      id: args.id,
      ...(args.extra !== undefined ? { extra: args.extra } : {}),
    });
    if (!identity) {
      return { subtitles: [] };
    }

    const validation = validateAddonConfig(args.config);
    if (!validation.valid || !validation.config.bilingualEnabled) {
      return { subtitles: [] };
    }

    const { config } = validation;

    try {
      let primaryAsset: RawSubtitleAsset | null = null;
      let secondaryAsset: RawSubtitleAsset | null = null;

      if (deps.discoveryOrchestrator) {
        const resolved = await deps.discoveryOrchestrator.resolveBilingualAssets(
          identity,
          config.primaryLanguage,
          config.secondaryLanguage,
        );
        if (resolved.status !== 'resolved' || !resolved.primaryAsset || !resolved.secondaryAsset) {
          return { subtitles: [] };
        }
        primaryAsset = resolved.primaryAsset;
        secondaryAsset = resolved.secondaryAsset;
      } else if (deps.sourceProvider) {
        const baseQuery = {
          type: identity.mediaType,
          videoId: identity.canonicalId,
          ...(identity.videoHash !== undefined ? { videoHash: identity.videoHash } : {}),
          ...(identity.videoSize !== undefined ? { videoSize: identity.videoSize } : {}),
          ...(identity.filename !== undefined ? { filename: identity.filename } : {}),
        };
        const [p, s] = await Promise.all([
          deps.sourceProvider.fetchSubtitle({
            ...baseQuery,
            language: config.primaryLanguage,
          }),
          deps.sourceProvider.fetchSubtitle({
            ...baseQuery,
            language: config.secondaryLanguage,
          }),
        ]);
        primaryAsset = p;
        secondaryAsset = s;
      }

      if (!primaryAsset || !secondaryAsset) {
        return { subtitles: [] };
      }

      const delivery = deps.fileService.generateCombinedVtt(
        identity.canonicalId,
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
