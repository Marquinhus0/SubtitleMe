export const COMPANION_LOOPBACK_HOST = '127.0.0.1' as const;
export const DEFAULT_COMPANION_PORT = 7000;
export const MAX_COMPANION_SUBTITLE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_COMPANION_JSON_BODY_BYTES = 7 * 1024 * 1024; // Overhead for JSON wrapper around 5 MB text
export const MAX_COMPANION_STORED_TRACKS = 100;

export interface CompanionServerConfig {
  readonly host: '127.0.0.1';
  readonly port: number;
  readonly maxSubtitleBytes: number;
  readonly maxJsonBodyBytes: number;
  readonly maxStoredTracks: number;
}

/**
 * Enforces strict loopback-only host binding.
 * Never permits `0.0.0.0`, `::`, or remote/LAN interfaces.
 */
export function assertLoopbackHost(host: string | undefined): '127.0.0.1' {
  const normalized = (host ?? COMPANION_LOOPBACK_HOST).trim();
  if (normalized !== COMPANION_LOOPBACK_HOST) {
    throw new Error(
      `Security violation: Local Companion must bind exclusively to ${COMPANION_LOOPBACK_HOST}, refused "${normalized}".`,
    );
  }
  return COMPANION_LOOPBACK_HOST;
}

export function createCompanionConfig(options: {
  host?: string;
  port?: number;
  maxSubtitleBytes?: number;
  maxJsonBodyBytes?: number;
  maxStoredTracks?: number;
} = {}): CompanionServerConfig {
  const host = assertLoopbackHost(options.host);
  const port = options.port ?? DEFAULT_COMPANION_PORT;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid Companion port: ${String(port)}`);
  }

  return {
    host,
    port,
    maxSubtitleBytes: options.maxSubtitleBytes ?? MAX_COMPANION_SUBTITLE_BYTES,
    maxJsonBodyBytes: options.maxJsonBodyBytes ?? MAX_COMPANION_JSON_BODY_BYTES,
    maxStoredTracks: options.maxStoredTracks ?? MAX_COMPANION_STORED_TRACKS,
  };
}
