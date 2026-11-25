import { describe, expect, it } from 'vitest';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  StremioOpenSubtitlesV3Provider,
  startStremioAddonServer,
} from '../src/index';

const EN = `1\n00:00:01,000 --> 00:00:04,000\nHello there!\n`;
const PT = `1\n00:00:01,000 --> 00:00:04,000\nOlá você!\n`;

describe('Sprint 15.7 — live Studio settings (no reinstall) + styled ASS track (1.0.0-rc.6)', () => {
  it('applies settings saved via /companion/settings to a plain, unstyled install URL and serves a styled ASS track', async () => {
    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/subtitles/movie/tt1254207.json')) {
        return new Response(
          JSON.stringify({
            subtitles: [
              { id: '1', lang: 'pob', url: 'https://subs5.strem.io/pt.srt' },
              { id: '2', lang: 'eng', url: 'https://subs5.strem.io/en.srt' },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.endsWith('/pt.srt')) return new Response(PT, { status: 200 });
      if (url.endsWith('/en.srt')) return new Response(EN, { status: 200 });
      return new Response('nf', { status: 404 });
    };
    const v3 = new StremioOpenSubtitlesV3Provider({ enabled: true, fetchFn: mockFetch });
    const running = await startStremioAddonServer({ port: 0, discoveryProviders: [v3] });
    try {
      const token = running.companionAuth.getSessionToken();
      const save = await fetch(`${running.baseUrl}/companion/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [COMPANION_TOKEN_HEADER]: token,
          [COMPANION_CSRF_HEADER]: '1',
        },
        body: JSON.stringify({
          primaryLanguage: 'pt-BR',
          secondaryLanguage: 'en',
          primaryColor: '#FFFFFF',
          secondaryColor: '#FFD60A',
          secondaryStyle: 'italic',
          verticalPosition: 'high',
          bilingualEnabled: 'on',
        }),
      });
      expect(save.status).toBe(200);

      // Install URL has NO style config at all: live settings must still apply
      const plainCfg = encodeURIComponent(
        JSON.stringify({ primaryLanguage: 'en', secondaryLanguage: 'pt-BR', bilingualEnabled: 'on' }),
      );
      const res = await fetch(`${running.baseUrl}/${plainCfg}/subtitles/movie/tt1254207.json`);
      const json = (await res.json()) as { subtitles: Array<{ url: string; label: string }> };
      expect(json.subtitles.length).toBeGreaterThanOrEqual(2);
      expect(json.subtitles[0]?.label).toContain('ASS');

      const ass = await (await fetch(json.subtitles[0]?.url ?? '')).text();
      expect(ass).toContain('[V4+ Styles]');
      expect(ass).toContain('{\\c&HFFFFFF&}Olá você!');
      expect(ass).toContain('{\\c&H0AD6FF&}{\\i1}Hello there!{\\i0}');
      expect(ass).toMatch(/Style: Default,.*,2,40,40,220,1/);

      const vtt = await (await fetch(json.subtitles[1]?.url ?? '')).text();
      expect(vtt).toContain('line:72%');
      expect(vtt).toContain('<font color="#FFD60A"><i>Hello there!</i></font>');
    } finally {
      await running.close();
    }
  });
});
