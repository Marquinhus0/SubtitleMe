import { findLanguageDescriptor, type StremioAddonConfig } from '../config/addon-config';
import type { RuntimeSettingsStore } from '../config/runtime-settings';
import { validateAddonConfig } from '../config/config-validator';
import type { SubtitleFileService } from '../delivery/subtitle-file-service';
import { parseStremioContentId } from '../discovery/content-identifier';
import type { SubtitleDiscoveryOrchestrator } from '../discovery/discovery-orchestrator';
import type { RawSubtitleAsset, SubtitleSourceProvider } from '../sources/subtitle-source.interface';
import type {
  StremioSubtitlesRequest,
  StremioSubtitlesResponse,
} from '../types/stremio';

function hasCustomStyling(config: StremioAddonConfig): boolean {
  return (
    (config.primaryColor !== undefined && config.primaryColor !== 'none') ||
    (config.secondaryColor !== undefined && config.secondaryColor !== 'none') ||
    (config.secondaryStyle !== undefined && config.secondaryStyle !== 'none') ||
    (config.verticalPosition !== undefined && config.verticalPosition !== 'bottom')
  );
}

export interface SubtitlesHandlerDeps {
  settingsStore?: RuntimeSettingsStore;
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

    // Live Studio settings (saved in the Companion) override the static install-URL config
    const baseConfig = args.config && typeof args.config === 'object' ? args.config : {};
    const liveSettings = deps.settingsStore?.isConfigured() ? deps.settingsStore.get() : {};
    const validation = validateAddonConfig({ ...baseConfig, ...liveSettings });
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
        { ...config, outputFormat: config.outputFormat === 'srt' ? 'srt' : 'vtt' },
      );

      const primaryDesc = findLanguageDescriptor(config.primaryLanguage);
      const secondaryDesc = findLanguageDescriptor(config.secondaryLanguage);
      const primaryLabel = primaryDesc?.label ?? config.primaryLanguage;
      const secondaryLabel = secondaryDesc?.label ?? config.secondaryLanguage;
      const isoLang = primaryDesc?.iso639_2 ?? 'eng';

      const tracks = [
        {
          id: `subtitleme-${delivery.token}`,
          url: delivery.url,
          // ISO 639-2 code of primary language per Stremio Subtitles Object spec
          lang: isoLang,
          label: delivery.autoSyncApplied
            ? `SubtitleMe — ${primaryLabel} + ${secondaryLabel} [Auto-Sync]`
            : `SubtitleMe — ${primaryLabel} + ${secondaryLabel}`,
        },
      ];

      // Styled ASS track: Stremio renders .ass natively (colors, italics, vertical position)
      if (hasCustomStyling(config)) {
        const assDelivery = deps.fileService.generateCombinedVtt(
          identity.canonicalId,
          primaryAsset,
          secondaryAsset,
          { ...config, outputFormat: 'ass' },
        );
        tracks.unshift({
          id: `subtitleme-ass-${assDelivery.token}`,
          url: assDelivery.url,
          lang: isoLang,
          label: `SubtitleMe — ${primaryLabel} + ${secondaryLabel} [Estilizada ASS]`,
        });
      }

      // When Auto-Sync shifted timestamps, also offer the unshifted original pair as a selectable fallback
      if (config.autoSync === true && delivery.autoSyncApplied) {
        const rawDelivery = deps.fileService.generateCombinedVtt(
          identity.canonicalId,
          primaryAsset,
          secondaryAsset,
          { ...config, autoSync: false },
        );
        tracks.push({
          id: `subtitleme-raw-${rawDelivery.token}`,
          url: rawDelivery.url,
          lang: isoLang,
          label: `SubtitleMe — ${primaryLabel} + ${secondaryLabel} [Original]`,
        });
      }

      return {
        subtitles: tracks,
        cacheMaxAge,
      };
    } catch {
      // Never crash the Stremio handler on upstream source or parse failure
      return { subtitles: [] };
    }
  };
}
