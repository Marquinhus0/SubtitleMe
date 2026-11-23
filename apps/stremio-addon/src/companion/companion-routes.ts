import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SubtitleTrack } from '@subtitleme/shared-types';
import { mergeSubtitleTracks } from '@subtitleme/subtitle-core';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import { validateAddonConfig } from '../config/config-validator';
import { buildStremioInstallUrls } from '../configure/configure-model';
import type { CompanionAuth } from './companion-auth';
import {
  COMPANION_LOOPBACK_HOST,
  MAX_COMPANION_JSON_BODY_BYTES,
  MAX_COMPANION_SUBTITLE_BYTES,
} from './companion-config';
import type { CompanionSubtitleStore } from './companion-store';
import type {
  CompanionHealthResponse,
  CompanionPreviewCue,
  CompanionPreviewRequest,
} from './companion-types';
import { validateCompanionUpload, validateContentId } from './companion-validation';

const DELETE_SUBTITLE_ROUTE_RE = /^\/companion\/subtitles\/(local-[a-zA-Z0-9-]{8,64})$/;

export interface CompanionRoutesDeps {
  readonly auth: CompanionAuth;
  readonly store: CompanionSubtitleStore;
  readonly getBaseUrl: () => string;
  readonly maxSubtitleBytes?: number;
  readonly maxJsonBodyBytes?: number;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<{ ok: true; data: unknown } | { ok: false; statusCode: 400 | 413; error: string }> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    const finish = (
      result: { ok: true; data: unknown } | { ok: false; statusCode: 400 | 413; error: string },
    ) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    req.on('data', (chunk: Buffer) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        finish({
          ok: false,
          statusCode: 413,
          error: 'Request payload exceeds maximum allowed size.',
        });
        req.resume();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) return;
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        if (raw.trim().length === 0) {
          finish({ ok: false, statusCode: 400, error: 'Empty request body.' });
          return;
        }
        const parsed: unknown = JSON.parse(raw);
        finish({ ok: true, data: parsed });
      } catch {
        finish({ ok: false, statusCode: 400, error: 'Malformed JSON body.' });
      }
    });

    req.on('error', () => {
      finish({ ok: false, statusCode: 400, error: 'Failed to read request body.' });
    });
  });
}

function applyCompanionCorsHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  auth: CompanionAuth,
): void {
  const originHeader = Array.isArray(req.headers.origin)
    ? req.headers.origin[0]
    : req.headers.origin;

  // NEVER apply wildcard `*` to Companion administrative endpoints.
  // Only reflect explicitly registered loopback origins.
  if (originHeader && auth.isAllowedOrigin(originHeader)) {
    res.setHeader('Access-Control-Allow-Origin', originHeader);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-SubtitleMe-Token, X-SubtitleMe-CSRF');
}

/**
 * Handles all `/companion/*` local administrative API routes.
 * Enforces Host header DNS rebinding protection on every route, strict loopback Origin,
 * 256-bit ephemeral session token, and CSRF header on mutating operations.
 */
export function handleCompanionRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CompanionRoutesDeps,
): boolean {
  const urlPath = (req.url ?? '/').split('?')[0] ?? '/';
  if (!urlPath.startsWith('/companion')) {
    return false;
  }

  // DNS rebinding protection applies to ALL Companion routes including health & OPTIONS
  const hostCheck = deps.auth.validateHostHeader(req);
  if (!hostCheck.authorized) {
    sendJson(res, hostCheck.statusCode, { error: hostCheck.reason });
    return true;
  }

  applyCompanionCorsHeaders(req, res, deps.auth);

  if (req.method === 'OPTIONS') {
    const originHeader = Array.isArray(req.headers.origin)
      ? req.headers.origin[0]
      : req.headers.origin;
    if (!deps.auth.isAllowedOrigin(originHeader)) {
      sendJson(res, 403, { error: 'Forbidden origin.' });
      return true;
    }
    res.writeHead(204);
    res.end();
    return true;
  }

  // Public loopback health check (exposes no secrets or subtitle content)
  if (req.method === 'GET' && urlPath === '/companion/health') {
    const health: CompanionHealthResponse = {
      ok: true,
      service: 'subtitleme-local-companion',
      host: COMPANION_LOOPBACK_HOST,
      localOnly: true,
      registeredSubtitles: deps.store.count(),
    };
    sendJson(res, 200, health);
    return true;
  }

  // POST /companion/session/revoke — immediately revoke & rotate current session token
  if (req.method === 'POST' && urlPath === '/companion/session/revoke') {
    const authResult = deps.auth.authorizeRequest(req, true);
    if (!authResult.authorized) {
      sendJson(res, authResult.statusCode, { error: authResult.reason });
      return true;
    }
    deps.auth.revokeSession();
    sendJson(res, 200, {
      revoked: true,
      message: 'Session revoked. Reload /configure to obtain a fresh local session token.',
    });
    return true;
  }

  // GET /companion/storage — inspect local persistence status, quota, and recovery count
  if (req.method === 'GET' && urlPath === '/companion/storage') {
    const authResult = deps.auth.authorizeRequest(req, false);
    if (!authResult.authorized) {
      sendJson(res, authResult.statusCode, { error: authResult.reason });
      return true;
    }
    sendJson(res, 200, {
      storage: deps.store.getStorageStatus(),
    });
    return true;
  }

  // POST /companion/storage/consent — explicitly enable/disable local disk persistence
  if (req.method === 'POST' && urlPath === '/companion/storage/consent') {
    const authResult = deps.auth.authorizeRequest(req, true);
    if (!authResult.authorized) {
      sendJson(res, authResult.statusCode, { error: authResult.reason });
      return true;
    }

    void readJsonBody(req, 4096).then((bodyResult) => {
      if (!bodyResult.ok) {
        sendJson(res, bodyResult.statusCode, { error: bodyResult.error });
        return;
      }
      const payload = bodyResult.data as { enabled?: unknown };
      if (typeof payload.enabled !== 'boolean') {
        sendJson(res, 400, { error: 'Field "enabled" must be a boolean.' });
        return;
      }

      try {
        const status = deps.store.setPersistenceEnabled(payload.enabled);
        sendJson(res, 200, { storage: status });
      } catch (err) {
        sendJson(res, 413, {
          error: err instanceof Error ? err.message : 'Failed to update persistence setting.',
        });
      }
    });
    return true;
  }

  // GET /companion/subtitles — list registered local subtitle metadata
  if (req.method === 'GET' && urlPath === '/companion/subtitles') {
    const authResult = deps.auth.authorizeRequest(req, false);
    if (!authResult.authorized) {
      sendJson(res, authResult.statusCode, { error: authResult.reason });
      return true;
    }
    sendJson(res, 200, {
      subtitles: deps.store.listSummaries(),
    });
    return true;
  }

  // POST /companion/subtitles — upload and validate a local SRT/VTT file
  if (req.method === 'POST' && urlPath === '/companion/subtitles') {
    const authResult = deps.auth.authorizeRequest(req, true);
    if (!authResult.authorized) {
      sendJson(res, authResult.statusCode, { error: authResult.reason });
      return true;
    }

    const maxJsonBytes = deps.maxJsonBodyBytes ?? MAX_COMPANION_JSON_BODY_BYTES;
    const maxSubtitleBytes = deps.maxSubtitleBytes ?? MAX_COMPANION_SUBTITLE_BYTES;

    void readJsonBody(req, maxJsonBytes).then((bodyResult) => {
      if (!bodyResult.ok) {
        sendJson(res, bodyResult.statusCode, { error: bodyResult.error });
        return;
      }

      const validation = validateCompanionUpload(bodyResult.data, maxSubtitleBytes);
      if (!validation.ok) {
        sendJson(res, validation.statusCode, { error: validation.error });
        return;
      }

      try {
        const summary = deps.store.upsert(validation.value);
        sendJson(res, 201, { subtitle: summary });
      } catch (err) {
        sendJson(res, 413, {
          error: err instanceof Error ? err.message : 'Failed to store subtitle.',
        });
      }
    });
    return true;
  }

  // DELETE /companion/subtitles — clear entire local library & invalidate derived VTTs
  if (req.method === 'DELETE' && urlPath === '/companion/subtitles') {
    const authResult = deps.auth.authorizeRequest(req, true);
    if (!authResult.authorized) {
      sendJson(res, authResult.statusCode, { error: authResult.reason });
      return true;
    }

    const previousCount = deps.store.count();
    deps.store.clear();
    sendJson(res, 200, { cleared: true, removedCount: previousCount });
    return true;
  }

  // DELETE /companion/subtitles/:id — remove single local subtitle & invalidate derived VTTs
  if (req.method === 'DELETE' && urlPath.startsWith('/companion/subtitles/')) {
    const authResult = deps.auth.authorizeRequest(req, true);
    if (!authResult.authorized) {
      sendJson(res, authResult.statusCode, { error: authResult.reason });
      return true;
    }

    const match = DELETE_SUBTITLE_ROUTE_RE.exec(urlPath);
    const id = match?.[1];
    if (!id) {
      sendJson(res, 404, { error: 'Subtitle track not found.' });
      return true;
    }

    const removed = deps.store.removeById(id);
    if (!removed) {
      sendJson(res, 404, { error: 'Subtitle track not found.' });
      return true;
    }

    sendJson(res, 200, { deleted: true, id });
    return true;
  }

  // POST /companion/preview — preview merged bilingual cues for a contentId
  if (req.method === 'POST' && urlPath === '/companion/preview') {
    const authResult = deps.auth.authorizeRequest(req, true);
    if (!authResult.authorized) {
      sendJson(res, authResult.statusCode, { error: authResult.reason });
      return true;
    }

    void readJsonBody(req, 64 * 1024).then((bodyResult) => {
      if (!bodyResult.ok) {
        sendJson(res, bodyResult.statusCode, { error: bodyResult.error });
        return;
      }

      const payload = bodyResult.data as Partial<CompanionPreviewRequest>;
      const contentCheck = validateContentId(payload.contentId);
      if (!contentCheck.valid || !contentCheck.normalized) {
        sendJson(res, 400, { error: contentCheck.error ?? 'Invalid contentId.' });
        return;
      }

      const configCheck = validateAddonConfig({
        primaryLanguage: typeof payload.primaryLanguage === 'string' ? payload.primaryLanguage : '',
        secondaryLanguage:
          typeof payload.secondaryLanguage === 'string' ? payload.secondaryLanguage : '',
        primaryOffsetMs:
          payload.primaryOffsetMs !== undefined ? String(payload.primaryOffsetMs) : '0',
        secondaryOffsetMs:
          payload.secondaryOffsetMs !== undefined ? String(payload.secondaryOffsetMs) : '0',
        order: typeof payload.order === 'string' ? payload.order : 'primary-top',
        bilingualEnabled: 'on',
      });

      if (!configCheck.valid) {
        sendJson(res, 400, { error: configCheck.errors.join(' ') });
        return;
      }

      const primaryRec = deps.store.findByContentAndLanguage(
        contentCheck.normalized,
        configCheck.config.primaryLanguage,
      );
      const secondaryRec = deps.store.findByContentAndLanguage(
        contentCheck.normalized,
        configCheck.config.secondaryLanguage,
      );

      if (!primaryRec || !secondaryRec) {
        sendJson(res, 404, {
          error:
            'Both primary and secondary subtitle files must be uploaded for this contentId to generate a bilingual preview.',
          missingPrimary: !primaryRec,
          missingSecondary: !secondaryRec,
        });
        return;
      }

      const parsedPrimary = parseSubtitle(primaryRec.content, primaryRec.format);
      const parsedSecondary = parseSubtitle(secondaryRec.content, secondaryRec.format);
      if (parsedPrimary.status === 'error' || parsedSecondary.status === 'error') {
        sendJson(res, 400, { error: 'Failed to parse stored subtitle tracks.' });
        return;
      }

      const primaryTrack: SubtitleTrack = {
        id: primaryRec.id,
        language: primaryRec.language,
        label: primaryRec.language,
        source: 'local',
        cues: parsedPrimary.cues,
        offset: configCheck.config.primaryOffsetMs,
        enabled: true,
      };

      const secondaryTrack: SubtitleTrack = {
        id: secondaryRec.id,
        language: secondaryRec.language,
        label: secondaryRec.language,
        source: 'local',
        cues: parsedSecondary.cues,
        offset: configCheck.config.secondaryOffsetMs,
        enabled: true,
      };

      const merged = mergeSubtitleTracks(primaryTrack, secondaryTrack, {
        order: configCheck.config.order,
      });

      const limit = Math.min(Math.max(Number(payload.limit ?? 8), 1), 25);
      const previewCues: CompanionPreviewCue[] = merged.slice(0, limit).map((cue) => ({
        startTime: cue.start,
        endTime: cue.end,
        text: cue.text,
      }));

      sendJson(res, 200, {
        contentId: contentCheck.normalized,
        totalMergedCues: merged.length,
        cues: previewCues,
      });
    });
    return true;
  }

  // POST /companion/install-url — validate config and return local Stremio install URLs
  if (req.method === 'POST' && urlPath === '/companion/install-url') {
    const authResult = deps.auth.authorizeRequest(req, true);
    if (!authResult.authorized) {
      sendJson(res, authResult.statusCode, { error: authResult.reason });
      return true;
    }

    void readJsonBody(req, 32 * 1024).then((bodyResult) => {
      if (!bodyResult.ok) {
        sendJson(res, bodyResult.statusCode, { error: bodyResult.error });
        return;
      }

      const result = buildStremioInstallUrls(
        deps.getBaseUrl(),
        (bodyResult.data ?? {}) as Record<string, unknown>,
      );

      if (!result.ok) {
        sendJson(res, 400, { error: result.errors.join(' ') });
        return;
      }

      sendJson(res, 200, result.urls);
    });
    return true;
  }

  sendJson(res, 404, { error: 'Companion endpoint not found.' });
  return true;
}
