import { describe, expect, it } from 'vitest';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  StremioOpenSubtitlesV3Provider,
  SubtitleSyncAddonProvider,
  alignSecondaryCuesToPrimary,
  computeReleaseSimilarity,
  parseStremioContentId,
  startStremioAddonServer,
} from '../src/index';

const MOCK_EN_SRT = `1\n00:00:01,000 --> 00:00:04,000\nHello from OpenSubtitles!\n`;
const MOCK_PT_SRT = `1\n00:00:01,000 --> 00:00:04,000\nOlá do OpenSubtitles!\n`;

describe('Sprint 15.6 — Stremio 5 PNA, Subtitle Sync, Auto-Sync & Studio Styling (1.0.0-rc.5)', () => {
  it('emits Access-Control-Allow-Private-Network: true on Stremio protocol OPTIONS/GET/HEAD but NEVER on /companion/*', async () => {
    const running = await startStremioAddonServer({ port: 0 });
    try {
      const preflight = await fetch(`${running.baseUrl}/manifest.json`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://web.stremio.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Private-Network': 'true',
        },
      });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get('access-control-allow-private-network')).toBe('true');
      expect(preflight.headers.get('access-control-allow-origin')).toBe('*');

      const companionPreflight = await fetch(`${running.baseUrl}/companion/subtitles`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://web.stremio.com',
          'Access-Control-Request-Private-Network': 'true',
        },
      });
      expect(companionPreflight.status).toBe(403);
      expect(companionPreflight.headers.get('access-control-allow-private-network')).toBeNull();
    } finally {
      await running.close();
    }
  });

  it('configures Subtitle Sync URL, OpenSubtitles v1 key, and v3 at runtime without leaking secrets', async () => {
    const running = await startStremioAddonServer({ port: 0 });
    try {
      const token = running.companionAuth.getSessionToken();

      const updateRes = await fetch(`${running.baseUrl}/companion/opensubtitles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [COMPANION_TOKEN_HEADER]: token,
          [COMPANION_CSRF_HEADER]: '1',
        },
        body: JSON.stringify({
          subtitleSyncEnabled: true,
          subtitleSyncUrl: 'https://subtitlesync.stream/secret-user-token-xyz/manifest.json',
          v1Enabled: true,
          apiKey: 'super-secret-os-v1-key',
          v3Enabled: true,
        }),
      });
      expect(updateRes.status).toBe(200);
      const rawBody = await updateRes.text();
      expect(rawBody).not.toContain('super-secret-os-v1-key');
      expect(rawBody).not.toContain('secret-user-token-xyz');
      const parsed = JSON.parse(rawBody) as {
        subtitleSync: { enabled: boolean; hasUrl: boolean };
        v1: { enabled: boolean; hasApiKey: boolean };
        v3: { enabled: boolean };
      };
      expect(parsed.subtitleSync.enabled).toBe(true);
      expect(parsed.subtitleSync.hasUrl).toBe(true);
      expect(parsed.v1.enabled).toBe(true);
      expect(parsed.v1.hasApiKey).toBe(true);
      expect(parsed.v3.enabled).toBe(true);
    } finally {
      await running.close();
    }
  });

  it('falls back to plain IMDb endpoint in OpenSubtitles v3 when videoHash query lacks one language, and preserves literal colons for episodes', async () => {
    const requestedUrls: string[] = [];
    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      requestedUrls.push(url);
      // Hash-filtered query only has Portuguese, missing English!
      if (url.includes('/videoHash=')) {
        return new Response(
          JSON.stringify({
            subtitles: [{ id: '101', lang: 'pob', m: 'h', url: 'https://subs5.strem.io/mock-pt.srt' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      // Plain IMDb fallback has English!
      if (url.endsWith('/subtitles/series/tt0903747:1:2.json')) {
        return new Response(
          JSON.stringify({
            subtitles: [{ id: '102', lang: 'eng', url: 'https://subs5.strem.io/mock-en.srt' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url === 'https://subs5.strem.io/mock-pt.srt') return new Response(MOCK_PT_SRT, { status: 200 });
      if (url === 'https://subs5.strem.io/mock-en.srt') return new Response(MOCK_EN_SRT, { status: 200 });
      return new Response('Not found', { status: 404 });
    };

    const v3 = new StremioOpenSubtitlesV3Provider({ enabled: true, fetchFn: mockFetch });
    const running = await startStremioAddonServer({ port: 0, discoveryProviders: [v3] });
    try {
      const cfg = encodeURIComponent(
        JSON.stringify({
          primaryLanguage: 'pt-BR',
          secondaryLanguage: 'en',
          primaryOffsetMs: '0',
          secondaryOffsetMs: '0',
          order: 'primary-top',
          bilingualEnabled: 'on',
          primaryColor: '#FFFFFF',
          secondaryColor: '#FFD60A',
          secondaryStyle: 'italic-brackets',
          verticalPosition: 'raised',
        }),
      );
      const subRes = await fetch(
        `${running.baseUrl}/${cfg}/subtitles/series/tt0903747%3A1%3A2/videoHash=deadbeef12345678&videoSize=99999.json`,
      );
      expect(subRes.status).toBe(200);
      const subJson = (await subRes.json()) as { subtitles: Array<{ url: string }> };
      expect(subJson.subtitles).toHaveLength(2); // styled ASS + VTT
      expect(requestedUrls.some((u) => u.includes('/subtitles/series/tt0903747:1:2.json'))).toBe(true);

      const vttUrl = subJson.subtitles.find((s) => s.url.endsWith('.vtt'))?.url ?? '';
      const vttText = await (await fetch(vttUrl)).text();
      expect(vttText).toContain('line:84%');
      expect(vttText).toContain('<font color="#FFFFFF">Olá do OpenSubtitles!</font>');
      expect(vttText).toContain('<font color="#FFD60A"><i>[Hello from OpenSubtitles!]</i></font>');

      // Also verify .srt endpoint works seamlessly on the same token!
      const srtUrl = vttUrl.replace(/\.vtt$/, '.srt');
      const srtText = await (await fetch(srtUrl)).text();
      expect(srtText).toContain('00:00:01,000 --> 00:00:04,000');
      expect(srtText).not.toContain('line:84%');
    } finally {
      await running.close();
    }
  });

  it('auto-aligns intro-shifted secondary subtitles onto primary dialogue anchors and scores matching releases higher', () => {
    const gaps = [0, 3200, 7900, 14100, 18500, 26300, 31000, 39800, 44200, 53100, 59400, 68000, 74500, 83200];
    const primary = gaps.map((g, i) => ({
      id: String(i + 1),
      start: 10_000 + g,
      end: 11_800 + g,
      text: `Primary line ${i + 1}`,
    }));
    // Secondary comes from a release with a 3.4s earlier intro cut
    const secondary = primary.map((c) => ({
      id: c.id,
      start: c.start - 3_400,
      end: c.end - 3_400,
      text: `Secondary line ${c.id}`,
    }));

    const aligned = alignSecondaryCuesToPrimary(primary, secondary);
    expect(aligned.applied).toBe(true);
    expect(Math.abs(aligned.offsetMs - 3_400)).toBeLessThanOrEqual(250);
    expect(Math.abs((aligned.cues[0]?.start ?? 0) - 10_000)).toBeLessThanOrEqual(250);

    const webScore = computeReleaseSimilarity(
      'Movie.2026.1080p.AMZN.WEB-DL.DDP5.1.H.264-FLUX.mkv',
      'Movie.2026.1080p.AMZN.WEB-DL-FLUX',
    );
    const blurayMismatchScore = computeReleaseSimilarity(
      'Movie.2026.1080p.AMZN.WEB-DL.DDP5.1.H.264-FLUX.mkv',
      'Movie.2026.Extended.1080p.BluRay.x264-SPARKS',
    );
    expect(webScore).toBeGreaterThan(50);
    expect(blurayMismatchScore).toBeLessThan(0);

    const subSync = new SubtitleSyncAddonProvider({
      enabled: true,
      manifestUrl: 'https://subtitlesync.stream/abc/manifest.json',
    });
    expect(subSync.isEnabled()).toBe(true);
    expect(parseStremioContentId({ type: 'movie', id: 'tt1254207' })).not.toBeNull();
  });
});
