import http, { type Server } from 'node:http';
import { CompanionAuth } from './companion-auth';
import { createCompanionConfig } from './companion-config';
import { handleCompanionRoutes } from './companion-routes';
import { CompanionSubtitleStore } from './companion-store';

export interface StandaloneCompanionServerOptions {
  host?: string;
  port?: number;
  store?: CompanionSubtitleStore;
  auth?: CompanionAuth;
  maxSubtitleBytes?: number;
  maxJsonBodyBytes?: number;
}

export interface RunningCompanionServer {
  readonly server: Server;
  readonly host: '127.0.0.1';
  readonly port: number;
  readonly baseUrl: string;
  readonly auth: CompanionAuth;
  readonly store: CompanionSubtitleStore;
  close(): Promise<void>;
}

/**
 * Starts a standalone loopback-only (`127.0.0.1`) Local Companion HTTP server.
 * Refuses non-loopback hosts such as `0.0.0.0`.
 */
export async function startCompanionServer(
  options: StandaloneCompanionServerOptions = {},
): Promise<RunningCompanionServer> {
  const config = createCompanionConfig({
    ...(options.host !== undefined ? { host: options.host } : {}),
    ...(options.port !== undefined ? { port: options.port } : {}),
    ...(options.maxSubtitleBytes !== undefined
      ? { maxSubtitleBytes: options.maxSubtitleBytes }
      : {}),
    ...(options.maxJsonBodyBytes !== undefined
      ? { maxJsonBodyBytes: options.maxJsonBodyBytes }
      : {}),
  });

  const store = options.store ?? new CompanionSubtitleStore({ maxTracks: config.maxStoredTracks });
  const auth = options.auth ?? new CompanionAuth();
  let resolvedBaseUrl = `http://${config.host}:${config.port}`;

  const server = http.createServer((req, res) => {
    const handled = handleCompanionRoutes(req, res, {
      auth,
      store,
      getBaseUrl: () => resolvedBaseUrl,
      maxSubtitleBytes: config.maxSubtitleBytes,
      maxJsonBodyBytes: config.maxJsonBodyBytes,
    });

    if (!handled && !res.writableEnded) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  const actualPort = await new Promise<number>((resolvePort, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) {
        resolvePort(addr.port);
      } else {
        reject(new Error('Failed to bind Local Companion HTTP server port.'));
      }
    });
  });

  resolvedBaseUrl = `http://${config.host}:${actualPort}`;
  auth.registerAllowedPort(actualPort);

  return {
    server,
    host: config.host,
    port: actualPort,
    baseUrl: resolvedBaseUrl,
    auth,
    store,
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
