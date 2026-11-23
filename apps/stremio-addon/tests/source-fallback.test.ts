import { describe, expect, it } from 'vitest';
import {
  CompanionSubtitleStore,
  CompositeSubtitleSource,
  LocalFileSubtitleSource,
  OpenSubtitlesSourceProvider,
  SubtitleFileService,
  createSubtitlesHandler,
  validateCompanionUpload,
} from '../src/index';

const LOCAL_EN_SRT = `1
00:00:01,000 --> 00:00:03,000
Local English track.
`;

const EXTERNAL_PT_SRT = `1
00:00:01,000 --> 00:00:03,000
Legenda externa autorizada.
`;

describe('Sprint 11 — Source Selection, Local-First Priority & OpenSubtitles Fallback', () => {
  it('always prefers local tracks and never silently overwrites local with external', async () => {
    const store = new CompanionSubtitleStore();
    const up = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'en',
      filename: 'local-en.srt',
      content: LOCAL_EN_SRT,
    });
    if (!up.ok) throw new Error(up.error);
    store.upsert(up.value);

    let externalCalledForEn = false;
    const externalProvider = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: 'mock-key',
      fetchFn: async () => {
        externalCalledForEn = true;
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      },
    });

    const composite = new CompositeSubtitleSource({
      localProvider: new LocalFileSubtitleSource(store),
      externalProvider,
      externalFallbackEnabled: true,
    });

    const enAsset = await composite.fetchSubtitle({
      type: 'movie',
      videoId: 'tt1254207',
      language: 'en',
    });

    expect(enAsset?.content).toContain('Local English track.');
    expect(externalCalledForEn).toBe(false);
    expect(composite.getLastResolution()?.origin).toBe('local');
  });

  it('combines local primary with opt-in OpenSubtitles secondary only when fallback is enabled', async () => {
    const store = new CompanionSubtitleStore();
    const up = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'en',
      filename: 'local-en.srt',
      content: LOCAL_EN_SRT,
    });
    if (!up.ok) throw new Error(up.error);
    store.upsert(up.value);

    const mockExternal = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: 'mock-key',
      fetchFn: async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/subtitles?')) {
          return new Response(
            JSON.stringify({
              data: [{ attributes: { files: [{ file_id: 99, file_name: 'pt.srt' }] } }],
            }),
            { status: 200 },
          );
        }
        if (url.endsWith('/download')) {
          return new Response(
            JSON.stringify({ link: 'https://downloads.opensubtitles.com/temp/99.srt' }),
            { status: 200 },
          );
        }
        return new Response(EXTERNAL_PT_SRT, { status: 200 });
      },
    });

    // Fallback DISABLED -> returns empty subtitles (no external call)
    const compositeDisabled = new CompositeSubtitleSource({
      localProvider: new LocalFileSubtitleSource(store),
      externalProvider: mockExternal,
      externalFallbackEnabled: false,
    });
    const handlerDisabled = createSubtitlesHandler({
      sourceProvider: compositeDisabled,
      fileService: new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000' }),
    });
    expect(
      (await handlerDisabled({ type: 'movie', id: 'tt1254207' })).subtitles,
    ).toEqual([]);

    // Fallback ENABLED -> combines local EN + external PT into valid WebVTT
    const compositeEnabled = new CompositeSubtitleSource({
      localProvider: new LocalFileSubtitleSource(store),
      externalProvider: mockExternal,
      externalFallbackEnabled: true,
    });
    const fileService = new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000' });
    const handlerEnabled = createSubtitlesHandler({
      sourceProvider: compositeEnabled,
      fileService,
    });
    const res = await handlerEnabled({ type: 'movie', id: 'tt1254207' });
    expect(res.subtitles).toHaveLength(1);
    const token = res.subtitles[0]?.url.split('/generated/')[1]?.replace('.vtt', '') ?? '';
    const vtt = fileService.getVttByToken(token);
    expect(vtt).toContain('Local English track.');
    expect(vtt).toContain('Legenda externa autorizada.');
  });

  it('handles OpenSubtitles download failure (HTTP 500) and invalid downloaded file cleanly', async () => {
    // 1. Download link returns HTTP 500
    const failingDownload = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: 'mock-key',
      fetchFn: async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/subtitles?')) {
          return new Response(
            JSON.stringify({ data: [{ attributes: { files: [{ file_id: 500 }] } }] }),
            { status: 200 },
          );
        }
        if (url.endsWith('/download')) {
          return new Response(
            JSON.stringify({ link: 'https://downloads.opensubtitles.com/temp/500.srt' }),
            { status: 200 },
          );
        }
        return new Response('Server Error', { status: 500 });
      },
    });
    expect(
      await failingDownload.fetchSubtitle({ type: 'movie', videoId: 'tt1254207', language: 'en' }),
    ).toBeNull();
    expect(failingDownload.getDiagnostics().lastStatus).toBe('UPSTREAM_ERROR');

    // 2. Downloaded content is corrupted/unparseable -> handler returns empty subtitles safely
    const invalidDownload = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: 'mock-key',
      fetchFn: async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/subtitles?')) {
          return new Response(
            JSON.stringify({ data: [{ attributes: { files: [{ file_id: 777 }] } }] }),
            { status: 200 },
          );
        }
        if (url.endsWith('/download')) {
          return new Response(
            JSON.stringify({ link: 'https://downloads.opensubtitles.com/temp/777.srt' }),
            { status: 200 },
          );
        }
        return new Response('not a valid subtitle file at all', { status: 200 });
      },
    });

    const handler = createSubtitlesHandler({
      sourceProvider: invalidDownload,
      fileService: new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000' }),
    });
    expect((await handler({ type: 'movie', id: 'tt1254207' })).subtitles).toEqual([]);
  });
});
