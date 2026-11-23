import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleCompanionRoutes, type CompanionRoutesDeps } from '../companion/companion-routes';
import { renderConfigurePage } from '../configure/configure-page';
import { OPAQUE_TOKEN_REGEX, type SubtitleFileService } from '../delivery/subtitle-file-service';

const GENERATED_VTT_ROUTE_RE = /^\/generated\/([a-f0-9]{32,64})\.vtt$/;

export interface CustomRoutesContext {
  readonly fileService: SubtitleFileService;
  readonly companion?: CompanionRoutesDeps;
  readonly getBaseUrl: () => string;
}

/**
 * Applies Stremio protocol CORS headers ONLY to Stremio protocol endpoints
 * (`/manifest.json`, `/subtitles/...`, `/health`) and `/generated/:token.vtt`.
 * Administrative `/companion/*` routes NEVER receive wildcard `*` CORS.
 */
export function applyCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Handles custom non-SDK HTTP routes (`/health`, `/configure`, `/companion/*`,
 * and `/generated/:token.vtt`).
 * Returns `true` if handled, `false` to pass through to Stremio SDK router.
 */
export function handleCustomRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  context: CustomRoutesContext,
): boolean {
  const urlPath = (req.url ?? '/').split('?')[0] ?? '/';

  // Delegate Companion API routes first (they enforce Host, loopback Origin, Token, and CSRF)
  if (context.companion && urlPath.startsWith('/companion')) {
    return handleCompanionRoutes(req, res, context.companion);
  }

  if (req.method === 'OPTIONS') {
    applyCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.method === 'GET' && urlPath === '/health') {
    applyCorsHeaders(res);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        service: 'subtitleme-stremio-addon',
        status: 'healthy',
        localOnly: true,
      }),
    );
    return true;
  }

  if (req.method === 'GET' && (urlPath === '/configure' || urlPath === '/')) {
    if (!context.companion) {
      return false;
    }

    // Prevent DNS rebinding on /configure so remote domains cannot read the session token
    const hostCheck = context.companion.auth.validateHostHeader(req);
    if (!hostCheck.authorized) {
      res.writeHead(hostCheck.statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify({ error: hostCheck.reason }));
      return true;
    }

    const html = renderConfigurePage({
      baseUrl: context.getBaseUrl(),
      sessionToken: context.companion.auth.getOrRotateSessionToken(),
    });
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
    res.end(html);
    return true;
  }

  if (req.method === 'GET' && urlPath.startsWith('/generated/')) {
    applyCorsHeaders(res);
    const match = GENERATED_VTT_ROUTE_RE.exec(urlPath);
    const token = match?.[1];

    if (!token || !OPAQUE_TOKEN_REGEX.test(token)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Subtitle file not found.' }));
      return true;
    }

    const vttContent = context.fileService.getVttByToken(token);
    if (vttContent === null) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Subtitle file not found or expired.' }));
      return true;
    }

    res.writeHead(200, {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(vttContent);
    return true;
  }

  return false;
}
