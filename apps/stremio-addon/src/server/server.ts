import http, { type Server } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import stremioSdk from 'stremio-addon-sdk';
const { addonBuilder, getRouter } = stremioSdk;
import { createAddonManifest } from '../addon/manifest';
import { createSubtitlesHandler } from '../addon/subtitles-handler';
import { CompanionAuth } from '../companion/companion-auth';
import { assertLoopbackHost } from '../companion/companion-config';
import {
  CompanionPersistence,
  type CompanionPersistenceOptions,
} from '../companion/companion-persistence';
import { CompanionSubtitleStore } from '../companion/companion-store';
import { GeneratedSubtitleCache } from '../delivery/generated-subtitle-cache';
import { SubtitleFileService } from '../delivery/subtitle-file-service';
import { RuntimeSettingsStore } from '../config/runtime-settings';
import { join } from 'node:path';
import { SubtitleDiscoveryOrchestrator } from '../discovery/discovery-orchestrator';
import type { SubtitleDiscoveryProvider } from '../discovery/discovery-types';
import { LocalDiscoveryProvider } from '../discovery/local-discovery-provider';
import {
  OpenSubtitlesDiscoveryProvider,
  type OpenSubtitlesDiscoveryOptions,
} from '../discovery/opensubtitles-discovery-provider';
import {
  StremioOpenSubtitlesV3Provider,
  type StremioOpenSubtitlesV3Options,
} from '../discovery/stremio-opensubtitles-v3-provider';
import {
  SubtitleSyncAddonProvider,
  type SubtitleSyncProviderOptions,
} from '../discovery/subtitle-sync-provider';
import type { SubtitleSourceProvider } from '../sources/subtitle-source.interface';
import { applyCorsHeaders, handleCustomRoutes } from './routes';

export interface StremioAddonServerOptions {
  port?: number;
  host?: string;
  baseUrl?: string;
  /** Optional legacy single sourceProvider override (primarily for tests/fixtures). */
  sourceProvider?: SubtitleSourceProvider;
  /** Optional custom discovery providers (defaults to LocalDiscoveryProvider + opt-in OpenSubtitles). */
  discoveryProviders?: readonly SubtitleDiscoveryProvider[];
  /** Opt-in OpenSubtitles REST API v1 configuration (disabled by default). */
  openSubtitlesOptions?: OpenSubtitlesDiscoveryOptions;
  /** Opt-in Stremio OpenSubtitles v3 addon configuration (disabled by default). */
  openSubtitlesV3Options?: StremioOpenSubtitlesV3Options;
  /** Opt-in Subtitle Sync (subtitlesync.stream) addon configuration (disabled by default). */
  subtitleSyncOptions?: SubtitleSyncProviderOptions;
  /** Optional diagnostic callback invoked on Stremio subtitle requests. */
  onSubtitleRequest?: (info: { type: string; id: string; returnedCount: number }) => void;
  cache?: GeneratedSubtitleCache;
  companionStore?: CompanionSubtitleStore;
  companionAuth?: CompanionAuth;
  persistence?: CompanionPersistence;
  persistenceOptions?: CompanionPersistenceOptions;
}

export interface RunningStremioAddonServer {
  readonly server: Server;
  readonly host: '127.0.0.1';
  readonly port: number;
  readonly baseUrl: string;
  readonly fileService: SubtitleFileService;
  readonly companionStore: CompanionSubtitleStore;
  readonly companionAuth: CompanionAuth;
  readonly persistence: CompanionPersistence;
  readonly discoveryOrchestrator: SubtitleDiscoveryOrchestrator;
  close(): Promise<void>;
}

/**
 * Starts the local Stremio Addon + Local Companion HTTP server exclusively on `127.0.0.1`.
 * Combines the official `stremio-addon-sdk` router (`getRouter`) with `/configure`,
 * `/companion/*`, `/generated/:token.vtt`, and `/health`, backed by the Sprint 15.4
 * Subtitle Discovery Orchestrator (`LocalDiscoveryProvider` + opt-in external providers).
 */
export async function startStremioAddonServer(
  options: StremioAddonServerOptions = {},
): Promise<RunningStremioAddonServer> {
  const host = assertLoopbackHost(options.host);
  const requestedPort = options.port ?? 0;
  const cache = options.cache ?? new GeneratedSubtitleCache();

  const persistence =
    options.persistence ?? new CompanionPersistence(options.persistenceOptions ?? { enabled: false });

  // Wire Companion store invalidation directly to the VTT delivery cache
  const companionStore =
    options.companionStore ??
    new CompanionSubtitleStore({
      persistence,
      onTrackInvalidated: (sourceId) => {
        cache.invalidateBySourceId(sourceId);
      },
    });
  const companionAuth = options.companionAuth ?? new CompanionAuth();

  // Build discovery providers: local Companion first, then Subtitle Sync, OpenSubtitles v1, and OpenSubtitles v3
  const subtitleSyncAddon = new SubtitleSyncAddonProvider(
    options.subtitleSyncOptions ?? { enabled: false },
  );
  const openSubtitlesV1 = new OpenSubtitlesDiscoveryProvider(
    options.openSubtitlesOptions ?? { enabled: false },
  );
  const openSubtitlesV3 = new StremioOpenSubtitlesV3Provider(
    options.openSubtitlesV3Options ?? { enabled: false },
  );
  const providers: SubtitleDiscoveryProvider[] = options.discoveryProviders
    ? [...options.discoveryProviders]
    : [new LocalDiscoveryProvider(companionStore), subtitleSyncAddon, openSubtitlesV1, openSubtitlesV3];
  const discoveryOrchestrator = new SubtitleDiscoveryOrchestrator(providers);

  // Base URL is finalized once the OS assigns an ephemeral port (when port === 0)
  let resolvedBaseUrl = options.baseUrl ?? `http://${host}:${requestedPort}`;
  let fileService = new SubtitleFileService({ baseUrl: resolvedBaseUrl, cache });

  const manifest = createAddonManifest();
  const builder = new addonBuilder(manifest);

  const settingsStore = new RuntimeSettingsStore(join(persistence.getDataDir(), 'settings.json'));
  const providersFilePath = join(persistence.getDataDir(), 'providers.json');

  const saveProvidersToDisk = () => {
    if (!persistence.isEnabled()) return;
    try {
      mkdirSync(persistence.getDataDir(), { recursive: true, mode: 0o700 });
      const data = {
        subtitleSyncEnabled: subtitleSyncAddon.isEnabled(),
        subtitleSyncUrl: subtitleSyncAddon.getManifestUrlForPersistence() ?? '',
        v1Enabled: openSubtitlesV1.isEnabled(),
        v1ApiKey: openSubtitlesV1.getApiKeyForPersistence(),
        v3Enabled: openSubtitlesV3.isEnabled(),
      };
      writeFileSync(providersFilePath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
    } catch {
      // Non-fatal
    }
  };

  if (persistence.isEnabled()) {
    settingsStore.load();
    if (existsSync(providersFilePath)) {
      try {
        const saved = JSON.parse(readFileSync(providersFilePath, 'utf-8')) as Record<string, unknown>;
        if (!options.subtitleSyncOptions && typeof saved.subtitleSyncUrl === 'string' && saved.subtitleSyncUrl) {
          subtitleSyncAddon.configure({
            enabled: saved.subtitleSyncEnabled === true,
            manifestUrl: saved.subtitleSyncUrl,
          });
        }
        if (!options.openSubtitlesOptions && typeof saved.v1ApiKey === 'string' && saved.v1ApiKey) {
          openSubtitlesV1.configure({
            enabled: saved.v1Enabled === true,
            apiKey: saved.v1ApiKey,
          });
        }
        if (!options.openSubtitlesV3Options && typeof saved.v3Enabled === 'boolean') {
          openSubtitlesV3.setEnabled(saved.v3Enabled);
        }
      } catch {
        // Ignore corrupted providers.json
      }
    }
  }

  builder.defineSubtitlesHandler(async (args) => {
    const handler = createSubtitlesHandler({
      settingsStore,
      ...(options.sourceProvider !== undefined
        ? { sourceProvider: options.sourceProvider }
        : { discoveryOrchestrator }),
      fileService,
    });
    const result = await handler(args);
    options.onSubtitleRequest?.({
      type: args?.type ?? 'unknown',
      id: args?.id ?? '',
      returnedCount: result.subtitles.length,
    });
    return result;
  });

  const addonInterface = builder.getInterface();
  const sdkRouter = getRouter(addonInterface);

  const server = http.createServer((req, res) => {
    if (
      handleCustomRoutes(req, res, {
        fileService,
        getBaseUrl: () => resolvedBaseUrl,
        companion: {
          auth: companionAuth,
          store: companionStore,
          getBaseUrl: () => resolvedBaseUrl,
          openSubtitlesV1,
          openSubtitlesV3,
          subtitleSyncAddon,
          settingsStore,
          persistenceEnabled: () => persistence.isEnabled(),
          onSaveProviders: saveProvidersToDisk,
        },
      })
    ) {
      return;
    }

    applyCorsHeaders(res);
    sdkRouter(req, res, () => {
      if (!res.writableEnded) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
  });

  const actualPort = await new Promise<number>((resolvePort, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, host, () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) {
        resolvePort(addr.port);
      } else {
        reject(new Error('Failed to bind Stremio addon HTTP server port.'));
      }
    });
  });

  if (!options.baseUrl) {
    resolvedBaseUrl = `http://${host}:${actualPort}`;
    fileService = new SubtitleFileService({ baseUrl: resolvedBaseUrl, cache });
  }
  companionAuth.registerAllowedPort(actualPort);

  return {
    server,
    host,
    port: actualPort,
    baseUrl: resolvedBaseUrl,
    fileService,
    companionStore,
    companionAuth,
    persistence,
    discoveryOrchestrator,
    close(): Promise<void> {
      return new Promise((resolveClose, rejectClose) => {
        server.close((err) => {
          if (err) rejectClose(err);
          else resolveClose();
        });
      });
    },
  };
}
