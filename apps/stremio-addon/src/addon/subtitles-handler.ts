import {
  findLanguageDescriptor,
  getPrimaryStremioMenuLang,
  type StremioAddonConfig,
  type StremioOutputFormat,
} from '../config/addon-config';
import type { RuntimeSettingsStore } from '../config/runtime-settings';
import { validateAddonConfig } from '../config/config-validator';
import type { SubtitleFileService } from '../delivery/subtitle-file-service';
import { parseStremioContentId } from '../discovery/content-identifier';
import type { SubtitleDiscoveryOrchestrator } from '../discovery/discovery-orchestrator';
import type { RawSubtitleAsset, SubtitleSourceProvider } from '../sources/subtitle-source.interface';
import type {
  StremioSubtitleItem,
  StremioSubtitlesRequest,
  StremioSubtitlesResponse,
} from '../types/stremio';

function hasCustomStyling(config: StremioAddonConfig): boolean {
  return (
    (config.primaryColor !== undefined && config.primaryColor !== 'none') ||
    (config.secondaryColor !== undefined && config.secondaryColor !== 'none') ||
    (config.secondaryStyle !== undefined && config.secondaryStyle !== 'none') ||
    (config.verticalPosition !== undefined && config.verticalPosition !== 'bottom') ||
    (config.fontSize !== undefined && config.fontSize !== 46) ||
    (config.backgroundStyle !== undefined && config.backgroundStyle !== 'outline')
  );
}

function isNeutralWhiteColor(color: string | undefined): boolean {
  if (!color || color === 'none') return true;
  const upper = color.toUpperCase();
  return upper === '#FFFFFF' || upper === '#ECEBE8';
}

function resolveDualSubsOutputFormat(config: StremioAddonConfig): StremioOutputFormat {
  if (config.outputFormat) return config.outputFormat;
  const usesAssStyling =
    !isNeutralWhiteColor(config.secondaryColor) ||
    !isNeutralWhiteColor(config.primaryColor) ||
    (config.fontSize !== undefined && config.fontSize !== 46) ||
    (config.backgroundStyle !== undefined && config.backgroundStyle !== 'outline') ||
    (config.verticalPosition !== undefined && config.verticalPosition !== 'bottom');
  // DualSubs rule: colored/custom-sized tracks use .ass; White tracks use .srt so Stremio's native size controls apply!
  return usesAssStyling ? 'ass' : 'srt';
}

function shortProviderBadge(providerName: string | undefined): string {
  if (providerName === 'subtitle-sync-addon') return 'Sync';
  if (
    providerName === 'stremio-opensubtitles-v3' ||
    providerName === 'opensubtitles-rest-v1-discovery'
  ) {
    return 'OS';
  }
  if (providerName === 'local-companion-discovery') return 'Local';
  return 'Auto';
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
 * Supports both the classic single-track SubtitleMe contract and the DualSubs multi-pair
 * Studio mode (`pairCount`: 1..5 ranked pairs exposed under both native & learning languages).
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
    const primaryDesc = findLanguageDescriptor(config.primaryLanguage);
    const secondaryDesc = findLanguageDescriptor(config.secondaryLanguage);

    try {
      // === DUALSUBS MULTI-PAIR STUDIO MODE (activated whenever pairCount is configured) ===
      if (config.pairCount !== undefined && deps.discoveryOrchestrator) {
        const multi = await deps.discoveryOrchestrator.resolveMultipleBilingualPairs(
          identity,
          config.primaryLanguage,
          config.secondaryLanguage,
          {
            maxPairs: config.pairCount,
            ...(config.learnSrc !== undefined ? { primarySrc: config.learnSrc } : {}),
            ...(config.nativeSrc !== undefined ? { secondarySrc: config.nativeSrc } : {}),
          },
        );

        const nativeLangCode = secondaryDesc ? getPrimaryStremioMenuLang(secondaryDesc) : 'pob';
        const learnLangCode = primaryDesc ? getPrimaryStremioMenuLang(primaryDesc) : 'eng';
        const menuLangs = Array.from(new Set([nativeLangCode, learnLangCode]));

        if (multi.status !== 'resolved' || multi.pairs.length === 0) {
          const pName = primaryDesc?.labelPt ?? primaryDesc?.label ?? config.primaryLanguage;
          const sName = secondaryDesc?.labelPt ?? secondaryDesc?.label ?? config.secondaryLanguage;
          const missingLabel =
            multi.missingPrimary && multi.missingSecondary
              ? `SubtitleMe: sem legendas em ${pName} e ${sName} para este título`
              : multi.missingPrimary
                ? `SubtitleMe: sem legendas em ${pName} para este título`
                : `SubtitleMe: sem legendas em ${sName} para este título`;

          const notice = deps.fileService.generateNoticeSrt(
            `${identity.canonicalId}:${config.primaryLanguage}:${config.secondaryLanguage}`,
            `${missingLabel}.\nVerifique se outra fonte (Subtitle Sync / OpenSubtitles) possui legendas para este vídeo.`,
          );

          return {
            subtitles: menuLangs.map((lang, idx) => ({
              id: idx === 0 ? `dual-notice-${notice.token}` : `dual-notice-${notice.token}-l`,
              url: notice.url,
              lang,
              label: missingLabel,
            })),
            cacheMaxAge: 60,
          };
        }

        const targetFormat = resolveDualSubsOutputFormat(config);
        const effectiveConfig: StremioAddonConfig =
          targetFormat === 'srt'
            ? {
                ...config,
                primaryColor: 'none',
                secondaryColor: 'none',
                outputFormat: 'srt',
              }
            : {
                ...config,
                outputFormat: targetFormat,
              };

        const pShort = (primaryDesc?.bcp47 ?? config.primaryLanguage).toUpperCase();
        const sShort = (secondaryDesc?.bcp47 ?? config.secondaryLanguage).toUpperCase();
        const pairTag =
          config.order === 'secondary-top' ? `${sShort}+${pShort}` : `${pShort}+${sShort}`;

        const rawBuilt = multi.pairs.map((pair) => {
          const delivery = deps.fileService.generateCombinedVtt(
            identity.canonicalId,
            pair.primaryAsset,
            pair.secondaryAsset,
            effectiveConfig,
            undefined,
            pair.syncAnchor,
          );
          const pBadge = shortProviderBadge(pair.primaryProvider);
          const sBadge = shortProviderBadge(pair.secondaryProvider);
          const topBadge = config.order === 'secondary-top' ? sBadge : pBadge;
          const botBadge = config.order === 'secondary-top' ? pBadge : sBadge;
          const pct = delivery.syncPercent ?? 85;
          const hasSyncAddon = pBadge === 'Sync' || sBadge === 'Sync' ? 1 : 0;
          return { token: delivery.token, url: delivery.url, topBadge, botBadge, pct, hasSyncAddon };
        });

        // Order options so Subtitle Sync / highest cue-overlap % is always #1 in Stremio's menu
        rawBuilt.sort((a, b) => b.hasSyncAddon - a.hasSyncAddon || b.pct - a.pct);

        const revealBadge =
          (config.revealMs ?? 0) > 0
            ? ` · +${((config.revealMs ?? 0) / 1000).toFixed((config.revealMs ?? 0) % 1000 === 0 ? 0 : 1)}s`
            : '';
        const builtPairs = rawBuilt.map((item, idx) => ({
          token: item.token,
          url: item.url,
          idx,
          label: `Dual ${pairTag} ${idx + 1} (${item.topBadge}/${item.botBadge}) · ${item.pct}%${revealBadge}`,
        }));

        // Expose all N pairs under native language first, then under learning language (exact DualSubs menu UX)
        const subtitles: StremioSubtitleItem[] = [];
        for (const [langIdx, lang] of menuLangs.entries()) {
          const suffix = langIdx === 0 ? '' : '-l';
          for (const item of builtPairs) {
            subtitles.push({
              id: `dual-${item.idx}-${item.token.slice(0, 16)}${suffix}`,
              url: item.url,
              lang,
              label: item.label,
            });
          }
        }

        return {
          subtitles,
          cacheMaxAge,
        };
      }

      // === CLASSIC SINGLE-PAIR MODE (preserves backward compatibility with all existing suites) ===
      let primaryAsset: RawSubtitleAsset | null = null;
      let secondaryAsset: RawSubtitleAsset | null = null;
      let syncAnchor: 'primary' | 'secondary' = 'primary';

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
        syncAnchor = resolved.syncAnchor ?? 'primary';
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
        undefined,
        syncAnchor,
      );

      const primaryLabel = primaryDesc?.label ?? config.primaryLanguage;
      const secondaryLabel = secondaryDesc?.label ?? config.secondaryLanguage;
      const isoLang = primaryDesc?.iso639_2 ?? 'eng';

      const tracks: StremioSubtitleItem[] = [
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

      // Styled ASS track: Stremio renders .ass natively (colors, font size, box/outline, vertical position)
      if (hasCustomStyling(config)) {
        const assDelivery = deps.fileService.generateCombinedVtt(
          identity.canonicalId,
          primaryAsset,
          secondaryAsset,
          { ...config, outputFormat: 'ass' },
          undefined,
          syncAnchor,
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
