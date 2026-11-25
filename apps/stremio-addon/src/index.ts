import { attachGracefulShutdown, checkPortAvailable } from './companion/companion-lifecycle';
import { isDirectExecution } from './companion/entrypoint';
import { startStremioAddonServer } from './server/server';

export { createAddonManifest } from './addon/manifest';
export { createSubtitlesHandler } from './addon/subtitles-handler';
export { isDirectExecution } from './companion/entrypoint';
export {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  DEFAULT_SESSION_TTL_MS,
  CompanionAuth,
  type CompanionAuthOptions,
  type CompanionAuthResult,
} from './companion/companion-auth';
export {
  COMPANION_LOOPBACK_HOST,
  DEFAULT_COMPANION_PORT,
  MAX_COMPANION_JSON_BODY_BYTES,
  MAX_COMPANION_STORED_TRACKS,
  MAX_COMPANION_SUBTITLE_BYTES,
  assertLoopbackHost,
  createCompanionConfig,
  type CompanionServerConfig,
} from './companion/companion-config';
export {
  attachGracefulShutdown,
  checkPortAvailable,
  type GracefulShutdownController,
  type PortCheckResult,
} from './companion/companion-lifecycle';
export {
  DEFAULT_MAX_PERSISTENCE_BYTES,
  CompanionPersistence,
  assertNotSymlink,
  assertPathInsideDir,
  type CompanionPersistenceOptions,
  type CompanionStorageStatus,
  type PersistedIndexEntry,
  type PersistenceRecoveryResult,
} from './companion/companion-persistence';
export { handleCompanionRoutes, type CompanionRoutesDeps } from './companion/companion-routes';
export {
  startCompanionServer,
  type RunningCompanionServer,
  type StandaloneCompanionServerOptions,
} from './companion/companion-server';
export { CompanionSubtitleStore, type CompanionStoreOptions } from './companion/companion-store';
export type {
  CompanionHealthResponse,
  CompanionPreviewCue,
  CompanionPreviewRequest,
  CompanionSubtitleRecord,
  CompanionSubtitleSummary,
  CompanionUploadRequest,
  ContentAssociationKind,
} from './companion/companion-types';
export {
  validateCompanionUpload,
  validateContentId,
  validateSubtitleFilename,
  type UploadValidationResult,
  type ValidatedSubtitleUpload,
} from './companion/companion-validation';
export {
  DEFAULT_ADDON_CONFIG,
  STREMIO_SUPPORTED_LANGUAGES,
  findLanguageDescriptor,
  type StremioAddonConfig,
  type StremioLanguageDescriptor,
} from './config/addon-config';
export { validateAddonConfig, type ConfigValidationResult } from './config/config-validator';
export {
  buildStremioInstallUrls,
  getDefaultConfigureState,
  serializeStremioConfigForUrl,
  type StremioInstallUrls,
} from './configure/configure-model';
export { renderConfigurePage, type ConfigurePageOptions } from './configure/configure-page';
export {
  GeneratedSubtitleCache,
  type CacheEntryMetadata,
  type CachedVttEntry,
  type GeneratedSubtitleCacheOptions,
} from './delivery/generated-subtitle-cache';
export {
  MAX_SOURCE_SUBTITLE_BYTES,
  OPAQUE_TOKEN_REGEX,
  SubtitleFileService,
  type GeneratedSubtitleDelivery,
} from './delivery/subtitle-file-service';
export {
  CompositeSubtitleSource,
  type CompositeSourceOptions,
  type LastResolutionInfo,
  type SubtitleResolutionOrigin,
} from './sources/composite-subtitle-source';
export { LocalFileSubtitleSource } from './sources/local-file-subtitle-source';
export { MockFixtureSubtitleSource } from './sources/mock-subtitle-source';
export {
  OPENSUBTITLES_DEFAULT_BASE_URL,
  OPENSUBTITLES_DEFAULT_TIMEOUT_MS,
  OpenSubtitlesSourceProvider,
  type OpenSubtitlesErrorCode,
  type OpenSubtitlesFetchDiagnostics,
  type OpenSubtitlesSourceOptions,
} from './sources/opensubtitles-source';
export type {
  RawSubtitleAsset,
  SubtitleSourceProvider,
  SubtitleSourceQuery,
} from './sources/subtitle-source.interface';
export {
  doesContentIdentityMatch,
  parseStremioContentId,
  type ContentIdNamespace,
  type StremioContentIdentity,
} from './discovery/content-identifier';
export {
  SubtitleDiscoveryOrchestrator,
  type DiscoveryResolutionResult,
} from './discovery/discovery-orchestrator';
export type {
  DiscoverySourceOrigin,
  MatchConfidence,
  SubtitleDiscoveryCandidate,
  SubtitleDiscoveryProvider,
} from './discovery/discovery-types';
export { LocalDiscoveryProvider } from './discovery/local-discovery-provider';
export {
  OpenSubtitlesDiscoveryProvider,
  type OpenSubtitlesDiscoveryOptions,
} from './discovery/opensubtitles-discovery-provider';
export {
  STREMIO_OPENSUBTITLES_V3_BASE_URL,
  StremioOpenSubtitlesV3Provider,
  type StremioOpenSubtitlesV3Options,
} from './discovery/stremio-opensubtitles-v3-provider';
export {
  SubtitleSyncAddonProvider,
  type SubtitleSyncProviderOptions,
} from './discovery/subtitle-sync-provider';
export { computeReleaseSimilarity } from './discovery/release-similarity';
export { alignSecondaryCuesToPrimary, type AutoSyncAlignmentResult } from './delivery/auto-sync';
export {
  matchBilingualPair,
  selectBestCandidate,
  type BilingualMatchIncomplete,
  type BilingualMatchResult,
  type BilingualMatchSuccess,
} from './discovery/subtitle-matcher';
export {
  startStremioAddonServer,
  type RunningStremioAddonServer,
  type StremioAddonServerOptions,
} from './server/server';

const isDirectRun =
  typeof process !== 'undefined' && isDirectExecution(import.meta.url, process.argv[1]);

if (isDirectRun) {
  const rawPort = process.env.PORT ?? '7000';
  const port = Number(rawPort);
  const persistenceEnabled = process.env.SUBTITLEME_PERSISTENCE === '1';
  const openSubtitlesOptIn = process.env.OPENSUBTITLES_ENABLED === '1';
  const openSubtitlesApiKey = (process.env.OPENSUBTITLES_API_KEY ?? '').trim();
  const openSubtitlesV3OptIn = process.env.OPENSUBTITLES_V3_ENABLED !== '0';
  const subtitleSyncUrl = (process.env.SUBTITLE_SYNC_URL ?? '').trim();

  void (async () => {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error(
        `[SubtitleMe Companion] Invalid PORT "${rawPort}". Expected an integer between 1 and 65535.`,
      );
      process.exitCode = 1;
      return;
    }

    const portCheck = await checkPortAvailable(port, '127.0.0.1');
    if (!portCheck.available) {
      console.error(`[SubtitleMe Companion] ${portCheck.reason}`);
      process.exitCode = 1;
      return;
    }

    const running = await startStremioAddonServer({
      port,
      persistenceOptions: {
        enabled: persistenceEnabled,
        ...(process.env.SUBTITLEME_DATA_DIR ? { dataDir: process.env.SUBTITLEME_DATA_DIR } : {}),
      },
      ...(openSubtitlesOptIn && openSubtitlesApiKey.length > 0
        ? {
            openSubtitlesOptions: {
              enabled: true,
              apiKey: openSubtitlesApiKey,
              ...(process.env.OPENSUBTITLES_BEARER_TOKEN
                ? { bearerToken: process.env.OPENSUBTITLES_BEARER_TOKEN }
                : {}),
            },
          }
        : {}),
      ...(openSubtitlesV3OptIn
        ? {
            openSubtitlesV3Options: {
              enabled: true,
            },
          }
        : {}),
      ...(subtitleSyncUrl.length > 0
        ? {
            subtitleSyncOptions: {
              enabled: true,
              manifestUrl: subtitleSyncUrl,
            },
          }
        : {}),
      onSubtitleRequest: ({ type, id, returnedCount }) => {
        console.log(
          `[SubtitleMe] Stremio subtitle query: type=${type} id=${id} -> ${returnedCount} track(s)`,
        );
      },
    });

    attachGracefulShutdown(running, (signal) => {
      console.log(`[SubtitleMe Companion] Graceful shutdown completed (${signal}).`);
    });

    console.log(
      `SubtitleMe Stremio Addon + Local Companion listening at ${running.baseUrl} (PID ${process.pid})`,
    );
    console.log(`Configure UI: ${running.baseUrl}/configure`);
    console.log(`Manifest URL: ${running.baseUrl}/manifest.json`);
    console.log(
      `Local Persistence: ${running.persistence.isEnabled() ? `ENABLED (${running.persistence.getDataDir()})` : 'DISABLED (memory-only; set SUBTITLEME_PERSISTENCE=1 or enable in /configure)'}`,
    );
    console.log(
      `OpenSubtitles Opt-In: v1=${openSubtitlesOptIn && openSubtitlesApiKey.length > 0 ? 'ENABLED' : 'DISABLED'}, v3=${openSubtitlesV3OptIn ? 'ENABLED' : 'DISABLED'} (configurable at ${running.baseUrl}/configure)`,
    );
  })().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[SubtitleMe Companion] Fatal startup error: ${message}`);
    process.exitCode = 1;
  });
}
