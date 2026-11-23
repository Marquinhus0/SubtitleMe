import net from 'node:net';
import type { RunningStremioAddonServer } from '../server/server';
import { assertLoopbackHost } from './companion-config';

export interface PortCheckResult {
  readonly available: boolean;
  readonly port: number;
  readonly host: '127.0.0.1';
  readonly reason?: string;
}

/**
 * Probes whether a port is free on `127.0.0.1` before launching the server,
 * returning a human-readable diagnostic message when already bound.
 */
export async function checkPortAvailable(
  port: number,
  host: string = '127.0.0.1',
): Promise<PortCheckResult> {
  const safeHost = assertLoopbackHost(host);
  if (port === 0) {
    return { available: true, port: 0, host: safeHost };
  }

  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve({
          available: false,
          port,
          host: safeHost,
          reason: `Port ${port} is already in use on ${safeHost}. Set PORT=<other> to use a different port.`,
        });
      } else {
        resolve({
          available: false,
          port,
          host: safeHost,
          reason: `Unable to bind ${safeHost}:${port} (${err.code ?? err.message}).`,
        });
      }
    });

    tester.once('listening', () => {
      tester.close(() => {
        resolve({ available: true, port, host: safeHost });
      });
    });

    tester.listen(port, safeHost);
  });
}

export interface GracefulShutdownController {
  readonly shutdown: (signal?: string) => Promise<void>;
  readonly detach: () => void;
}

/**
 * Attaches SIGINT and SIGTERM handlers to gracefully close the HTTP server
 * and purge ephemeral in-memory VTT caches without leaving orphaned sockets.
 */
export function attachGracefulShutdown(
  running: RunningStremioAddonServer,
  onShutdownComplete?: (signal: string) => void,
): GracefulShutdownController {
  let shuttingDown = false;

  const shutdown = async (signal: string = 'manual'): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    // Clear ephemeral generated VTT cache on exit
    running.fileService.getCache().clear();
    await running.close();
    onShutdownComplete?.(signal);
  };

  const onSigInt = () => {
    void shutdown('SIGINT');
  };
  const onSigTerm = () => {
    void shutdown('SIGTERM');
  };

  process.on('SIGINT', onSigInt);
  process.on('SIGTERM', onSigTerm);

  return {
    shutdown,
    detach: () => {
      process.off('SIGINT', onSigInt);
      process.off('SIGTERM', onSigTerm);
    },
  };
}
