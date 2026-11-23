import http from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  CompanionAuth,
  startStremioAddonServer,
} from '../src/index';

function sendRawHttpRequest(options: {
  port: number;
  path: string;
  method?: string;
  headers?: Record<string, string>;
}): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: options.port,
        path: options.path,
        method: options.method ?? 'GET',
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf-8'),
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('Sprint 11 — Companion Security Audit (DNS Rebinding, Session TTL, CORS Separation)', () => {
  it('blocks DNS rebinding via spoofed Host headers on /configure and /companion/*', async () => {
    const running = await startStremioAddonServer({ port: 0 });
    try {
      // Spoofed Host header on /configure -> 403
      const cfgRebind = await sendRawHttpRequest({
        port: running.port,
        path: '/configure',
        headers: { Host: 'evil-rebind.example.com' },
      });
      expect(cfgRebind.statusCode).toBe(403);
      expect(cfgRebind.body).toContain('DNS rebinding');

      // Spoofed Host header on /companion/health -> 403
      const healthRebind = await sendRawHttpRequest({
        port: running.port,
        path: '/companion/health',
        headers: { Host: 'evil-rebind.example.com' },
      });
      expect(healthRebind.statusCode).toBe(403);

      // Spoofed Host header on /companion/subtitles even with valid token -> 403
      const apiRebind = await sendRawHttpRequest({
        port: running.port,
        path: '/companion/subtitles',
        headers: {
          Host: 'attacker.local:7000',
          [COMPANION_TOKEN_HEADER]: running.companionAuth.getSessionToken(),
        },
      });
      expect(apiRebind.statusCode).toBe(403);
    } finally {
      await running.close();
    }
  });

  it('expires Companion session tokens after TTL and rejects stale tokens with 401', async () => {
    let fakeNow = 500_000;
    const auth = new CompanionAuth({
      sessionTtlMs: 1_000,
      nowProvider: () => fakeNow,
    });
    const running = await startStremioAddonServer({ port: 0, companionAuth: auth });
    try {
      const initialToken = auth.getSessionToken();

      // Valid before expiry
      const okRes = await fetch(`${running.baseUrl}/companion/subtitles`, {
        headers: { [COMPANION_TOKEN_HEADER]: initialToken },
      });
      expect(okRes.status).toBe(200);

      // Advance past TTL -> old token rejected with 401
      fakeNow += 2_000;
      const expiredRes = await fetch(`${running.baseUrl}/companion/subtitles`, {
        headers: { [COMPANION_TOKEN_HEADER]: initialToken },
      });
      expect(expiredRes.status).toBe(401);
      expect(await expiredRes.text()).toContain('expired');

      // Reloading /configure rotates and issues a fresh valid token
      const reloadCfg = await fetch(`${running.baseUrl}/configure`);
      expect(reloadCfg.status).toBe(200);
      const freshToken = auth.getSessionToken();
      expect(freshToken).not.toBe(initialToken);

      const okAfterRotate = await fetch(`${running.baseUrl}/companion/subtitles`, {
        headers: { [COMPANION_TOKEN_HEADER]: freshToken },
      });
      expect(okAfterRotate.status).toBe(200);
    } finally {
      await running.close();
    }
  });

  it('separates CORS strictly: no wildcard * on /companion/*, wildcard * only on Stremio protocol', async () => {
    const running = await startStremioAddonServer({ port: 0 });
    try {
      // Companion OPTIONS preflight from foreign origin -> 403 and NO Access-Control-Allow-Origin: *
      const evilPreflight = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://malicious.example' },
      });
      expect(evilPreflight.status).toBe(403);
      expect(evilPreflight.headers.get('access-control-allow-origin')).toBeNull();

      // Companion GET with loopback origin reflects ONLY that loopback origin, never '*'
      const loopbackGet = await fetch(`${running.baseUrl}/companion/subtitles`, {
        headers: {
          Origin: running.baseUrl,
          [COMPANION_TOKEN_HEADER]: running.companionAuth.getSessionToken(),
        },
      });
      expect(loopbackGet.status).toBe(200);
      expect(loopbackGet.headers.get('access-control-allow-origin')).toBe(running.baseUrl);
      expect(loopbackGet.headers.get('access-control-allow-origin')).not.toBe('*');

      // Stremio protocol endpoint /manifest.json still serves CORS '*' as required by Stremio
      const manifestRes = await fetch(`${running.baseUrl}/manifest.json`);
      expect(manifestRes.status).toBe(200);
      expect(manifestRes.headers.get('access-control-allow-origin')).toBe('*');

      // DELETE /companion/subtitles without CSRF header -> 403
      const noCsrfClear = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'DELETE',
        headers: {
          Origin: running.baseUrl,
          [COMPANION_TOKEN_HEADER]: running.companionAuth.getSessionToken(),
        },
      });
      expect(noCsrfClear.status).toBe(403);

      // DELETE /companion/subtitles with CSRF header -> 200
      const okClear = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'DELETE',
        headers: {
          Origin: running.baseUrl,
          [COMPANION_TOKEN_HEADER]: running.companionAuth.getSessionToken(),
          [COMPANION_CSRF_HEADER]: '1',
        },
      });
      expect(okClear.status).toBe(200);
    } finally {
      await running.close();
    }
  });
});
