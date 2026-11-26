import { describe, expect, it } from 'vitest';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  STREMIO_SUPPORTED_LANGUAGES,
  StremioOpenSubtitlesV3Provider,
  SubtitleSyncAddonProvider,
  findLanguageDescriptor,
  startStremioAddonServer,
} from '../src/index';

const EN_PAIR_1 = `1
00:00:20,604 --> 00:00:23,355
Are you okay?

2
00:01:55,532 --> 00:01:57,409
You are a lifesaver. Yeah, man.
`;

const PT_PAIR_1 = `1
00:00:20,604 --> 00:00:23,355
Tudo bem com você?

2
00:01:16,732 --> 00:01:19,335
12 HORAS ANTES

3
00:01:55,532 --> 00:01:57,409
- Você foi nossa escapatória.
- Foi, cara.
`;

const EN_PAIR_2 = `1
00:00:20,700 --> 00:00:23,400
Are you okay?

2
00:01:55,600 --> 00:01:57,500
You are a lifesaver. Yeah, man.
`;

const PT_PAIR_2 = `1
00:00:20,700 --> 00:00:23,400
Está tudo bem?

2
00:01:55,600 --> 00:01:57,500
Salvou a nossa pele.
`;

describe('Sprint 15.9 — DualSubs Full Architecture Replication (1.0.0-rc.8)', () => {
  it('supports all 37 DualSubs languages and resolves Stremio 3-letter aliases (pob, fre, ger, chi, dut, tur, kor)', () => {
    expect(STREMIO_SUPPORTED_LANGUAGES).toHaveLength(37);
    expect(findLanguageDescriptor('pob')?.bcp47).toBe('pt-BR');
    expect(findLanguageDescriptor('fre')?.bcp47).toBe('fr');
    expect(findLanguageDescriptor('ger')?.bcp47).toBe('de');
    expect(findLanguageDescriptor('chi')?.bcp47).toBe('zh');
    expect(findLanguageDescriptor('dut')?.bcp47).toBe('nl');
    expect(findLanguageDescriptor('tur')?.bcp47).toBe('tr');
    expect(findLanguageDescriptor('kor')?.bcp47).toBe('ko');
  });

  it('serves multi-pair ranked ASS tracks in both native (pob) & learn (eng) menu buckets, honors learnSrc/nativeSrc, and switches to SRT + non-jumping Reveal on White mode', async () => {
    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      if (url.startsWith('https://subtitlesync.stream/')) {
        if (url.endsWith('/pt-sync.srt')) return new Response(PT_PAIR_1, { status: 200 });
        if (url.endsWith('/en-sync.srt')) return new Response('SHOULD_NOT_BE_USED_WHEN_LEARN_OS', { status: 200 });
        return new Response(
          JSON.stringify({
            subtitles: [
              {
                id: '✅ Sincronizada · OpenSubtitles · Breaking.Bad.S01E02.WEB-DL',
                label: '✅ Sincronizada · OpenSubtitles · Breaking.Bad.S01E02.WEB-DL',
                lang: 'pob',
                url: 'https://subtitlesync.stream/dl/pt-sync.srt',
              },
              {
                id: '✅ Sincronizada · OpenSubtitles · Breaking.Bad.S01E02.WEB-DL',
                label: '✅ Sincronizada · OpenSubtitles · Breaking.Bad.S01E02.WEB-DL',
                lang: 'eng',
                url: 'https://subtitlesync.stream/dl/en-sync.srt',
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.includes('opensubtitles-v3.strem.io/subtitles/series/tt0903747:1:2.json')) {
        return new Response(
          JSON.stringify({
            subtitles: [
              {
                id: 'en-1',
                lang: 'eng',
                movieReleaseName: 'Breaking.Bad.S01E02.WEB-DL',
                url: 'https://subs5.strem.io/en-1.srt',
              },
              {
                id: 'en-2',
                lang: 'eng',
                movieReleaseName: 'Breaking.Bad.S01E02.BluRay',
                url: 'https://subs5.strem.io/en-2.srt',
              },
              {
                id: 'pt-2',
                lang: 'pob',
                movieReleaseName: 'Breaking.Bad.S01E02.BluRay',
                url: 'https://subs5.strem.io/pt-2.srt',
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (url === 'https://subs5.strem.io/en-1.srt') return new Response(EN_PAIR_1, { status: 200 });
      if (url === 'https://subs5.strem.io/en-2.srt') return new Response(EN_PAIR_2, { status: 200 });
      if (url === 'https://subs5.strem.io/pt-2.srt') return new Response(PT_PAIR_2, { status: 200 });
      return new Response('Not found', { status: 404 });
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
      // 1. Verify /configure serves DualSubs controls
      const cfgHtml = await (await fetch(`${running.baseUrl}/configure`)).text();
      expect(cfgHtml).toContain('Estou aprendendo');
      expect(cfgHtml).toContain('Meu idioma');
      expect(cfgHtml).toContain('Atrasar meu idioma');
      expect(cfgHtml).toContain('#FFD76A');
      expect(cfgHtml).toContain('Estilizar legendas ASS');

      const token = running.companionAuth.getSessionToken();
      const headers = {
        'Content-Type': 'application/json',
        [COMPANION_TOKEN_HEADER]: token,
        [COMPANION_CSRF_HEADER]: '1',
      };

      // 2. Configure DualSubs Gold (#FFD76A), pairCount=2, learnSrc='os', nativeSrc='auto'
      const save1 = await fetch(`${running.baseUrl}/companion/settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          primaryLanguage: 'en',
          secondaryLanguage: 'pt-BR',
          order: 'primary-top',
          bilingualEnabled: 'on',
          primaryColor: '#FFFFFF',
          secondaryColor: '#FFD76A',
          secondaryStyle: 'italic',
          autoSync: 'on',
          learnSrc: 'os',
          nativeSrc: 'auto',
          pairCount: '2',
          revealMs: '0',
        }),
      });
      expect(save1.status).toBe(200);

      const res1 = await fetch(`${running.baseUrl}/subtitles/series/tt0903747%3A1%3A2.json`);
      const json1 = (await res1.json()) as {
        subtitles: Array<{ id: string; url: string; lang: string; label: string }>;
      };
      // 2 pairs x 2 menu languages (pob + eng) = 4 items!
      expect(json1.subtitles).toHaveLength(4);
      expect(json1.subtitles.slice(0, 2).map((s) => s.lang)).toEqual(['pob', 'pob']);
      expect(json1.subtitles.slice(2, 4).map((s) => s.lang)).toEqual(['eng', 'eng']);
      // Pair 1 used OS for English (learnSrc='os') and Sync for PT-BR (nativeSrc='auto')!
      expect(json1.subtitles[0]?.label).toMatch(/^Dual EN\+PT-BR 1 \(OS\/Sync\) · \d+%$/);
      expect(json1.subtitles[1]?.label).toMatch(/^Dual EN\+PT-BR 2 \(OS\/OS\) · \d+%$/);
      expect(json1.subtitles[0]?.url.endsWith('.ass')).toBe(true);

      const assBody = await (await fetch(json1.subtitles[0]?.url ?? '')).text();
      expect(assBody).toContain('Are you okay?');
      // #FFD76A in ASS BGR is &H6AD7FF&
      expect(assBody).toContain('{\\c&H6AD7FF&}{\\i1}Tudo bem com você?{\\i0}');

      // 3. Switch live to White ('none') + Reveal=1000ms -> serves .srt with non-breaking space line lock!
      const save2 = await fetch(`${running.baseUrl}/companion/settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          primaryLanguage: 'en',
          secondaryLanguage: 'pt-BR',
          order: 'primary-top',
          bilingualEnabled: 'on',
          primaryColor: 'none',
          secondaryColor: 'none',
          secondaryStyle: 'italic',
          autoSync: 'on',
          learnSrc: 'os',
          nativeSrc: 'sync',
          pairCount: '1',
          revealMs: '1000',
        }),
      });
      expect(save2.status).toBe(200);

      const res2 = await fetch(`${running.baseUrl}/subtitles/series/tt0903747%3A1%3A2.json`);
      const json2 = (await res2.json()) as {
        subtitles: Array<{ id: string; url: string; lang: string; label: string }>;
      };
      expect(json2.subtitles).toHaveLength(2); // 1 pair x (pob + eng)
      expect(json2.subtitles[0]?.url.endsWith('.srt')).toBe(true);
      expect(json2.subtitles[0]?.label).toContain('+1s');

      const srtBody = await (await fetch(json2.subtitles[0]?.url ?? '')).text();
      // Cue 1a (20.604 -> 21.604): English + non-breaking space placeholder so top line never jumps!
      expect(srtBody).toContain('00:00:20,604 --> 00:00:21,604\nAre you okay?\n<i>\u00A0</i>');
      // Cue 1b (21.604 -> 23.355): English + revealed Portuguese!
      expect(srtBody).toContain(
        '00:00:21,604 --> 00:00:23,355\nAre you okay?\n<i>Tudo bem com você?</i>',
      );
      // Sign cue ("12 HORAS ANTES") has no overlapping English speech -> shown immediately without delay!
      expect(srtBody).toContain('00:01:16,732 --> 00:01:19,335\n<i>12 HORAS ANTES</i>');
      // Multi-line cue reserves 2 lines of <i>\u00A0</i>!
      expect(srtBody).toContain(
        '00:01:55,532 --> 00:01:56,532\nYou are a lifesaver. Yeah, man.\n<i>\u00A0</i>\n<i>\u00A0</i>',
      );

      // 4. Title with missing subtitles in DualSubs mode returns friendly notice .srt under both languages
      const resMissing = await fetch(`${running.baseUrl}/subtitles/movie/tt9999999.json`);
      const jsonMissing = (await resMissing.json()) as {
        subtitles: Array<{ id: string; url: string; lang: string; label: string }>;
      };
      expect(jsonMissing.subtitles).toHaveLength(2);
      expect(jsonMissing.subtitles[0]?.id).toContain('dual-notice-');
      expect(jsonMissing.subtitles[0]?.label).toContain('sem legendas');
      const noticeSrt = await (await fetch(jsonMissing.subtitles[0]?.url ?? '')).text();
      expect(noticeSrt).toContain('00:00:01,000 --> 00:00:13,000');
      expect(noticeSrt).toContain('sem legendas');
    } finally {
      await running.close();
    }
  });
});
