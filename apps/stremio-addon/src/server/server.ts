import http, { type Server } from 'node:http';
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
import { LocalFileSubtitleSource } from '../sources/local-file-subtitle-source';
import type { SubtitleSourceProvider } from '../sources/subtitle-source.interface';
import { applyCorsHeaders, handleCustomRoutes } from './routes';

export interface StremioAddonServerOptions {
  port?: number;
  host?: string;
  baseUrl?: string;
  sourceProvider?: SubtitleSourceProvider;
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
  close(): Promise<void>;
}

/**
 * Starts the local Stremio Addon + Local Companion HTTP server exclusively on `127.0.0.1`.
 * Combines the official `stremio-addon-sdk` router (`getRouter`) with `/configure`,
 * `/companion/*`, `/generated/:token.vtt`, and `/health`.
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

  const sourceProvider = options.sourceProvider ?? new LocalFileSubtitleSource(companionStore);

  // Base URL is finalized once the OS assigns an ephemeral port (when port === 0)
  let resolvedBaseUrl = options.baseUrl ?? `http://${host}:${requestedPort}`;
  let fileService = new SubtitleFileService({ baseUrl: resolvedBaseUrl, cache });

  const manifest = createAddonManifest();
  const builder = new addonBuilder(manifest);

  builder.defineSubtitlesHandler((args) => {
    const handler = createSubtitlesHandler({
      sourceProvider,
      fileService,
    });
    return handler(args);
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
