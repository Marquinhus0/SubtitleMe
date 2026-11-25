import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleCompanionRoutes, type CompanionRoutesDeps } from '../companion/companion-routes';
import { renderConfigurePage } from '../configure/configure-page';
import { OPAQUE_TOKEN_REGEX, type SubtitleFileService } from '../delivery/subtitle-file-service';

const GENERATED_SUBTITLE_ROUTE_RE = /^\/generated\/([a-f0-9]{32,64})\.(vtt|srt|ass)$/;

export interface CustomRoutesContext {
  readonly fileService: SubtitleFileService;
  readonly companion?: CompanionRoutesDeps;
  readonly getBaseUrl: () => string;
}

/**
 * Applies Stremio protocol CORS + Chromium Private Network Access (PNA) headers ONLY to
 * Stremio protocol endpoints (`/manifest.json`, `/subtitles/...`, `/health`) and
 * `/generated/:token.(vtt|srt)` so Stremio 5 Desktop (`https://web.stremio.com` WebView2)
 * can fetch loopback tracks without PNA preflight blocks.
 * Administrative `/companion/*` routes NEVER receive wildcard `*` CORS or PNA headers.
 */
export function applyCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
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

  if ((req.method === 'GET' || req.method === 'HEAD') && urlPath.startsWith('/generated/')) {
    applyCorsHeaders(res);
    const match = GENERATED_SUBTITLE_ROUTE_RE.exec(urlPath);
    const token = match?.[1];
    const requestedExt = match?.[2] ?? 'vtt';

    if (!token || !OPAQUE_TOKEN_REGEX.test(token)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ error: 'Subtitle file not found.' }));
      return true;
    }

    const payloadContent =
      requestedExt === 'srt'
        ? context.fileService.getSrtByToken(token)
        : context.fileService.getVttByToken(token);
    if (payloadContent === null) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        req.method === 'HEAD'
          ? undefined
          : JSON.stringify({ error: 'Subtitle file not found or expired.' }),
      );
      return true;
    }

    const contentType =
      requestedExt === 'srt'
        ? 'application/x-subrip; charset=utf-8'
        : requestedExt === 'ass'
          ? 'text/x-ssa; charset=utf-8'
          : 'text/vtt; charset=utf-8';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : payloadContent);
    return true;
  }

  return false;
}
