import { describe, expect, it } from 'vitest';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  assertLoopbackHost,
  startCompanionServer,
  startStremioAddonServer,
} from '../src/index';

const VALID_SRT = `1
00:00:01,000 --> 00:00:04,000
Hello from local SRT.

2
00:00:05,000 --> 00:00:08,000
Two languages. One experience.
`;

const VALID_VTT = `WEBVTT

1
00:00:02.000 --> 00:00:04.500
Olá do VTT local.

2
00:00:05.000 --> 00:00:08.000
Dois idiomas. Uma experiência.
`;

describe('Sprint 10 — Local Companion Security, Validation & HTTP API', () => {
  it('refuses non-loopback hosts such as 0.0.0.0 and binds exclusively to 127.0.0.1', async () => {
    expect(() => assertLoopbackHost('0.0.0.0')).toThrow(/127\.0\.0\.1/);
    expect(() => assertLoopbackHost('192.168.1.10')).toThrow(/127\.0\.0\.1/);
    expect(() => assertLoopbackHost('::')).toThrow(/127\.0\.0\.1/);
    await expect(startCompanionServer({ host: '0.0.0.0', port: 0 })).rejects.toThrow(/127\.0\.0\.1/);

    const running = await startCompanionServer({ port: 0 });
    try {
      expect(running.host).toBe('127.0.0.1');
      expect(running.baseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

      const healthRes = await fetch(`${running.baseUrl}/companion/health`);
      expect(healthRes.status).toBe(200);
      const health = (await healthRes.json()) as {
        ok: boolean;
        host: string;
        localOnly: boolean;
        registeredSubtitles: number;
      };
      expect(health.ok).toBe(true);
      expect(health.host).toBe('127.0.0.1');
      expect(health.localOnly).toBe(true);
      expect(health.registeredSubtitles).toBe(0);
    } finally {
      await running.close();
    }
  });

  it('enforces session token, CSRF header, and loopback Origin validation', async () => {
    const running = await startCompanionServer({ port: 0 });
    try {
      const token = running.auth.getSessionToken();

      // Missing token -> 401
      const unauthGet = await fetch(`${running.baseUrl}/companion/subtitles`);
      expect(unauthGet.status).toBe(401);

      // Missing CSRF header on POST -> 403
      const noCsrfPost = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [COMPANION_TOKEN_HEADER]: token,
        },
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'en',
          filename: 'movie.srt',
          content: VALID_SRT,
        }),
      });
      expect(noCsrfPost.status).toBe(403);

      // Evil cross-origin request -> 403 even with valid token & CSRF
      const evilOrigin = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://evil.example.com',
          [COMPANION_TOKEN_HEADER]: token,
          [COMPANION_CSRF_HEADER]: '1',
        },
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'en',
          filename: 'movie.srt',
          content: VALID_SRT,
        }),
      });
      expect(evilOrigin.status).toBe(403);
    } finally {
      await running.close();
    }
  });

  it('validates SRT/VTT uploads and rejects oversized, invalid, spoofed, path-traversal, and credential payloads', async () => {
    const running = await startCompanionServer({
      port: 0,
      maxSubtitleBytes: 1024, // small cap for fast oversize test
      maxJsonBodyBytes: 4096,
    });
    try {
      const token = running.auth.getSessionToken();
      const headers = {
        'Content-Type': 'application/json',
        Origin: running.baseUrl,
        [COMPANION_TOKEN_HEADER]: token,
        [COMPANION_CSRF_HEADER]: '1',
      };

      // Valid SRT upload -> 201
      const srtRes = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'en',
          filename: 'english.srt',
          content: VALID_SRT,
        }),
      });
      expect(srtRes.status).toBe(201);
      const srtData = (await srtRes.json()) as { subtitle: { id: string; cueCount: number } };
      expect(srtData.subtitle.cueCount).toBe(2);

      // Valid VTT upload -> 201
      const vttRes = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'pt-BR',
          filename: 'portuguese.vtt',
          content: VALID_VTT,
        }),
      });
      expect(vttRes.status).toBe(201);

      // Oversized file -> 413
      const bigContent = `${VALID_SRT}\n${'A'.repeat(1500)}`;
      const bigRes = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'es',
          filename: 'big.srt',
          content: bigContent,
        }),
      });
      expect(bigRes.status).toBe(413);

      // Spoofed extension (.srt containing binary/null bytes) -> 400
      const spoofBinary = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'es',
          filename: 'fake.srt',
          content: 'MZ\0\0binary-payload',
        }),
      });
      expect(spoofBinary.status).toBe(400);

      // Spoofed extension (.srt containing HTML script) -> 400
      const spoofHtml = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'es',
          filename: 'xss.srt',
          content: '<html><script>alert(1)</script></html>',
        }),
      });
      expect(spoofHtml.status).toBe(400);

      // Spoofed extension (.vtt missing WEBVTT header) -> 400
      const spoofVtt = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'es',
          filename: 'wrong.vtt',
          content: VALID_SRT,
        }),
      });
      expect(spoofVtt.status).toBe(400);

      // Path traversal / arbitrary path rejected -> 400
      const traversal = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'es',
          filename: '../../etc/passwd.srt',
          content: VALID_SRT,
        }),
      });
      expect(traversal.status).toBe(400);

      // Forbidden URL / credential fields rejected -> 400
      const withUrl = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'es',
          filename: 'ok.srt',
          content: VALID_SRT,
          url: 'https://remote.example/sub.srt',
        }),
      });
      expect(withUrl.status).toBe(400);

      // Delete track -> 200
      const delRes = await fetch(
        `${running.baseUrl}/companion/subtitles/${encodeURIComponent(srtData.subtitle.id)}`,
        {
          method: 'DELETE',
          headers,
        },
      );
      expect(delRes.status).toBe(200);
      expect(running.store.count()).toBe(1);
    } finally {
      await running.close();
    }
  });

  it('executes full MVP flow: /configure UI + Companion upload + Stremio subtitles + VTT delivery + delete invalidation', async () => {
    const running = await startStremioAddonServer({ port: 0 });
    try {
      // 1. /configure serves Modern Dark HTML with ephemeral session token
      const cfgRes = await fetch(`${running.baseUrl}/configure`);
      expect(cfgRes.status).toBe(200);
      const html = await cfgRes.text();
      expect(html).toContain('SubtitleMe — Stremio Local Companion');
      expect(html).toContain('100% Local Processing');
      expect(html).toContain(running.companionAuth.getSessionToken());

      const token = running.companionAuth.getSessionToken();
      const headers = {
        'Content-Type': 'application/json',
        Origin: running.baseUrl,
        [COMPANION_TOKEN_HEADER]: token,
        [COMPANION_CSRF_HEADER]: '1',
      };

      // 2. Upload primary (SRT) and secondary (VTT) for tt1254207
      const upPrimary = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'en',
          filename: 'bbb-en.srt',
          content: VALID_SRT,
        }),
      });
      expect(upPrimary.status).toBe(201);
      const primaryRecord = ((await upPrimary.json()) as { subtitle: { id: string } }).subtitle;

      const upSecondary = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'pt-BR',
          filename: 'bbb-pt.vtt',
          content: VALID_VTT,
        }),
      });
      expect(upSecondary.status).toBe(201);

      // 3. Preview bilingual cues via Companion with independent offsets & secondary-top order
      const previewRes = await fetch(`${running.baseUrl}/companion/preview`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contentId: 'tt1254207',
          primaryLanguage: 'en',
          secondaryLanguage: 'pt-BR',
          primaryOffsetMs: 500,
          secondaryOffsetMs: -500,
          order: 'secondary-top',
        }),
      });
      expect(previewRes.status).toBe(200);
      const preview = (await previewRes.json()) as {
        totalMergedCues: number;
        cues: Array<{ startTime: number; endTime: number; text: string }>;
      };
      expect(preview.totalMergedCues).toBeGreaterThan(0);

      // 4. Generate configured Stremio install URL
      const installRes = await fetch(`${running.baseUrl}/companion/install-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          primaryLanguage: 'en',
          secondaryLanguage: 'pt-BR',
          primaryOffsetMs: '200',
          secondaryOffsetMs: '-100',
          order: 'secondary-top',
          bilingualEnabled: 'on',
        }),
      });
      expect(installRes.status).toBe(200);
      const installUrls = (await installRes.json()) as {
        encodedConfig: string;
        httpManifestUrl: string;
        stremioDeepLink: string;
      };
      expect(installUrls.httpManifestUrl).toContain('/manifest.json');
      expect(installUrls.stremioDeepLink).toMatch(/^stremio:\/\/127\.0\.0\.1:\d+\//);

      // 5. Request subtitles from Stremio SDK route using the configured path
      const subRes = await fetch(
        `${running.baseUrl}/${installUrls.encodedConfig}/subtitles/movie/tt1254207.json`,
      );
      expect(subRes.status).toBe(200);
      const subJson = (await subRes.json()) as {
        subtitles: Array<{ id: string; url: string; lang: string; label?: string }>;
      };
      expect(subJson.subtitles).toHaveLength(1);
      const subtitleItem = subJson.subtitles[0];
      expect(subtitleItem?.lang).toBe('eng');
      expect(subtitleItem?.label).toBe('SubtitleMe — English + Portuguese (Brazil)');

      // 6. Fetch generated VTT over HTTP and verify valid merged cues + secondary-top ordering
      const vttRes = await fetch(subtitleItem?.url ?? '');
      expect(vttRes.status).toBe(200);
      expect(vttRes.headers.get('content-type')).toContain('text/vtt');
      expect(vttRes.headers.get('cache-control')).toContain('no-store');
      const vttText = await vttRes.text();
      const parsedVtt = parseSubtitle(vttText, 'vtt');
      expect(parsedVtt.status).toBe('success');
      expect(
        parsedVtt.cues.some(
          (c) => c.text.includes('Olá do VTT local.') && c.text.includes('Hello from local SRT.'),
        ),
      ).toBe(true);

      // 7. Delete primary subtitle -> derived generated VTT MUST be invalidated immediately (404)
      const delRes = await fetch(
        `${running.baseUrl}/companion/subtitles/${encodeURIComponent(primaryRecord.id)}`,
        {
          method: 'DELETE',
          headers,
        },
      );
      expect(delRes.status).toBe(200);

      const afterDeleteVtt = await fetch(subtitleItem?.url ?? '');
      expect(afterDeleteVtt.status).toBe(404);
    } finally {
      await running.close();
    }
  });
});
