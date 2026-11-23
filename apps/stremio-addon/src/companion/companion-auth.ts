import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export const COMPANION_TOKEN_HEADER = 'x-subtitleme-token';
export const COMPANION_CSRF_HEADER = 'x-subtitleme-csrf';
export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface CompanionAuthOptions {
  allowedPort?: number;
  explicitToken?: string;
  sessionTtlMs?: number;
  nowProvider?: () => number;
}

export interface CompanionAuthResult {
  readonly authorized: boolean;
  readonly statusCode: 200 | 401 | 403;
  readonly reason?: string;
}

/**
 * Manages the ephemeral local session token, session expiration, Host header
 * DNS rebinding protection, and CSRF/Origin verification for the Local Companion.
 *
 * Security model:
 * - A 256-bit cryptographically random session token is generated on startup with bounded TTL.
 * - Rejects non-loopback `Host` headers to prevent DNS rebinding attacks.
 * - All authenticated Companion API endpoints require:
 *   1. Valid loopback `Host` header (`127.0.0.1:<port>` or `localhost:<port>`).
 *   2. Valid loopback `Origin` (or no Origin for non-browser local clients, never a remote origin).
 *   3. Valid non-expired `X-SubtitleMe-Token` header verified with constant-time comparison.
 *   4. `X-SubtitleMe-CSRF: 1` custom header on state-changing requests.
 */
export class CompanionAuth {
  private sessionToken: string;
  private expiresAt: number;
  private readonly sessionTtlMs: number;
  private readonly now: () => number;
  private readonly allowedOrigins = new Set<string>();
  private readonly allowedHosts = new Set<string>();

  public constructor(optionsOrPort?: number | CompanionAuthOptions, explicitToken?: string) {
    const opts: CompanionAuthOptions =
      typeof optionsOrPort === 'number'
        ? {
            allowedPort: optionsOrPort,
            ...(explicitToken !== undefined ? { explicitToken } : {}),
          }
        : (optionsOrPort ?? {});

    this.now = opts.nowProvider ?? (() => Date.now());
    this.sessionTtlMs = opts.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
    this.sessionToken = opts.explicitToken ?? randomBytes(32).toString('hex');
    this.expiresAt = this.now() + this.sessionTtlMs;

    if (opts.allowedPort !== undefined && opts.allowedPort > 0) {
      this.registerAllowedPort(opts.allowedPort);
    }
  }

  public registerAllowedPort(port: number): void {
    this.allowedOrigins.add(`http://127.0.0.1:${port}`);
    this.allowedOrigins.add(`http://localhost:${port}`);
    this.allowedHosts.add(`127.0.0.1:${port}`);
    this.allowedHosts.add(`localhost:${port}`);
  }

  public isSessionExpired(): boolean {
    return this.now() >= this.expiresAt;
  }

  /**
   * Returns the active session token, rotating it automatically if expired
   * when issuing a fresh `/configure` page.
   */
  public getOrRotateSessionToken(): string {
    if (this.isSessionExpired()) {
      this.sessionToken = randomBytes(32).toString('hex');
      this.expiresAt = this.now() + this.sessionTtlMs;
    }
    return this.sessionToken;
  }

  /**
   * Immediately revokes the current session token and rotates to a fresh 256-bit token,
   * invalidating all previously issued client tokens.
   */
  public revokeSession(): string {
    this.sessionToken = randomBytes(32).toString('hex');
    this.expiresAt = this.now() + this.sessionTtlMs;
    return this.sessionToken;
  }

  public getSessionToken(): string {
    return this.sessionToken;
  }

  public getExpiresAt(): number {
    return this.expiresAt;
  }

  /**
   * Validates the HTTP `Host` header against registered loopback hosts
   * to defeat DNS rebinding attacks (e.g., `evil.com` resolving to `127.0.0.1`).
   */
  public isAllowedHost(hostHeader: string | undefined): boolean {
    if (this.allowedHosts.size === 0) {
      // Allow tests calling auth before port binding only if host is explicit loopback
      if (!hostHeader) return true;
      const lower = hostHeader.trim().toLowerCase();
      return /^(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(lower);
    }
    if (!hostHeader) {
      return false;
    }
    return this.allowedHosts.has(hostHeader.trim().toLowerCase());
  }

  public isAllowedOrigin(origin: string | undefined): boolean {
    if (origin === undefined || origin === '') {
      // Non-browser local CLI / test requests do not send an Origin header
      return true;
    }
    return this.allowedOrigins.has(origin.trim().toLowerCase());
  }

  public verifyToken(candidate: string | undefined): boolean {
    if (this.isSessionExpired()) {
      return false;
    }
    if (!candidate || candidate.length !== this.sessionToken.length) {
      return false;
    }
    const expectedBuf = Buffer.from(this.sessionToken, 'utf-8');
    const candidateBuf = Buffer.from(candidate, 'utf-8');
    if (expectedBuf.length !== candidateBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, candidateBuf);
  }

  public validateHostHeader(req: IncomingMessage): CompanionAuthResult {
    const rawHost = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
    if (!this.isAllowedHost(rawHost)) {
      return {
        authorized: false,
        statusCode: 403,
        reason: 'Invalid Host header. DNS rebinding protection blocked this request.',
      };
    }
    return { authorized: true, statusCode: 200 };
  }

  public authorizeRequest(req: IncomingMessage, requireCsrf: boolean): CompanionAuthResult {
    const hostCheck = this.validateHostHeader(req);
    if (!hostCheck.authorized) {
      return hostCheck;
    }

    const originHeader = Array.isArray(req.headers.origin)
      ? req.headers.origin[0]
      : req.headers.origin;

    if (!this.isAllowedOrigin(originHeader)) {
      return {
        authorized: false,
        statusCode: 403,
        reason: 'Forbidden origin. Companion accepts loopback requests only.',
      };
    }

    if (this.isSessionExpired()) {
      return {
        authorized: false,
        statusCode: 401,
        reason: 'Session token expired. Reload /configure to obtain a fresh local session token.',
      };
    }

    const rawToken = req.headers[COMPANION_TOKEN_HEADER];
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    if (!this.verifyToken(token)) {
      return {
        authorized: false,
        statusCode: 401,
        reason: 'Missing or invalid Companion session token.',
      };
    }

    if (requireCsrf) {
      const rawCsrf = req.headers[COMPANION_CSRF_HEADER];
      const csrf = Array.isArray(rawCsrf) ? rawCsrf[0] : rawCsrf;
      if (csrf !== '1') {
        return {
          authorized: false,
          statusCode: 403,
          reason: 'Missing required CSRF protection header.',
        };
      }
    }

    return { authorized: true, statusCode: 200 };
  }
}
