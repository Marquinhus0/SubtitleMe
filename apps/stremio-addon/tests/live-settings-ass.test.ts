import { describe, expect, it } from 'vitest';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  StremioOpenSubtitlesV3Provider,
  SubtitleSyncAddonProvider,
  startStremioAddonServer,
} from '../src/index';

const GAPS = [0, 3200, 7900, 14100, 18500, 26300, 31000, 39800, 44200, 53100, 59400, 68000];

function buildSrt(offsetMs: number, prefix: string): string {
  return GAPS.map((g, idx) => {
    const s = 10_000 + g + offsetMs;
    const e = 11_800 + g + offsetMs;
    const fmt = (ms: number) => {
      const sec = Math.floor(ms / 1000);
      const rem = ms % 1000;
      const m = Math.floor(sec / 60);
      return `00:${String(m).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')},${String(rem).padStart(3, '0')}`;
    };
    return `${idx + 1}\n${fmt(s)} --> ${fmt(e)}\n${prefix} ${idx + 1}`;
  }).join('\n\n');
}

describe('Sprint 15.8 — Bidirectional Anchor Sync, Anti-Flicker & Dynamic ASS Styling (1.0.0-rc.7)', () => {
  it('anchors primary (OpenSubtitles) onto secondary (Subtitle Sync) when secondary is video-synced, and renders custom fontSize + Netflix box ASS', async () => {
    // Subtitle Sync has frame-synced PT-BR at true video timestamps (+0ms)
    const syncedPtSrt = buildSrt(0, 'Olá sincronizado');
    // OpenSubtitles has EN from a BluRay cut off by -4200ms!
    const unalignedEnSrt = buildSrt(-4200, 'Hello unaligned');

    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://subtitlesync.stream/') && url.endsWith('/manifest.json')) {
        return new Response(JSON.stringify({ name: 'Subtitle Sync', version: '2.10.7' }), { status: 200 });
      }
      if (url.startsWith('https://subtitlesync.stream/')) {
        if (url.endsWith('.srt')) return new Response(syncedPtSrt, { status: 200 });
        return new Response(
          JSON.stringify({
            subtitles: [
              {
                id: '✅ Sincronizada · OpenSubtitles · Movie.1080p.WEB-DL',
                label: '✅ Sincronizada · OpenSubtitles · Movie.1080p.WEB-DL',
                lang: 'pob',
                url: 'https://subtitlesync.stream/dl/pt.srt',
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes('/subtitles/movie/tt0133093.json')) {
        return new Response(
          JSON.stringify({
            subtitles: [{ id: '2', lang: 'eng', url: 'https://subs5.strem.io/en.srt' }],
          }),
          { status: 200 },
        );
      }
      if (url.endsWith('/en.srt')) return new Response(unalignedEnSrt, { status: 200 });
      return new Response('nf', { status: 404 });
    };

    const subSync = new SubtitleSyncAddonProvider({
      enabled: true,
      manifestUrl: 'https://subtitlesync.stream/tok/manifest.json',
      fetchFn: mockFetch,
    });
    const v3 = new StremioOpenSubtitlesV3Provider({ enabled: true, fetchFn: mockFetch });
    const running = await startStremioAddonServer({
      port: 0,
      discoveryProviders: [subSync, v3],
    });

    try {
      const token = running.companionAuth.getSessionToken();

      // Save dynamic Studio settings (EN primary + PT-BR secondary, custom fontSize=56, backgroundStyle='box', autoSync='on')
      const save = await fetch(`${running.baseUrl}/companion/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [COMPANION_TOKEN_HEADER]: token,
          [COMPANION_CSRF_HEADER]: '1',
        },
        body: JSON.stringify({
          primaryLanguage: 'en',
          secondaryLanguage: 'pt-BR',
          primaryColor: '#FFFFFF',
          secondaryColor: '#36CFC9',
          secondaryStyle: 'italic',
          verticalPosition: 'high',
          fontSize: '56',
          backgroundStyle: 'box',
          autoSync: 'on',
          bilingualEnabled: 'on',
        }),
      });
      expect(save.status).toBe(200);

      const plainCfg = encodeURIComponent(
        JSON.stringify({ primaryLanguage: 'en', secondaryLanguage: 'pt-BR', bilingualEnabled: 'on' }),
      );
      const res = await fetch(`${running.baseUrl}/${plainCfg}/subtitles/movie/tt0133093.json`);
      const json = (await res.json()) as { subtitles: Array<{ url: string; label: string }> };
      expect(json.subtitles.length).toBeGreaterThanOrEqual(2);

      const assUrl = json.subtitles.find((s) => s.url.endsWith('.ass'))?.url ?? '';
      const ass = await (await fetch(assUrl)).text();
      // Verify Fontsize=56 and BorderStyle=3 (Netflix semi-transparent box)
      expect(ass).toContain('Style: Default,Arial,56,');
      expect(ass).toContain(',3,10,0,2,40,40,220,1');
      // Verify unaligned English (-4.2s) was pulled onto Subtitle Sync's 0:00:10.00 anchor!
      expect(ass).toContain('Dialogue: 0,0:00:10.00,0:00:11.80,Default,,0,0,0,,{\\c&HFFFFFF&}Hello unaligned 1{\\c&HFFFFFF&}\\N{\\c&HC9CF36&}{\\i1}Olá sincronizado 1{\\i0}');
    } finally {
      await running.close();
    }
  });
});
