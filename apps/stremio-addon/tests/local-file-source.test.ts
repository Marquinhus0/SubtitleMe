import { describe, expect, it } from 'vitest';
import {
  CompanionSubtitleStore,
  LocalFileSubtitleSource,
  SubtitleFileService,
  createSubtitlesHandler,
  validateCompanionUpload,
} from '../src/index';

const EN_SRT = `1
00:00:01,000 --> 00:00:03,000
Primary line one.
`;

const PT_VTT = `WEBVTT

1
00:00:01.000 --> 00:00:03.000
Linha secundária um.
`;

function addValidatedTrack(
  store: CompanionSubtitleStore,
  contentId: string,
  language: string,
  filename: string,
  content: string,
): string {
  const res = validateCompanionUpload({ contentId, language, filename, content });
  if (!res.ok) {
    throw new Error(`Unexpected validation error: ${res.error}`);
  }
  return store.upsert(res.value).id;
}

describe('Sprint 10 — LocalFileSubtitleSource', () => {
  it('returns both normalized assets when primary and secondary tracks match explicit contentId', async () => {
    const store = new CompanionSubtitleStore();
    addValidatedTrack(store, 'tt1254207', 'en', 'en.srt', EN_SRT);
    addValidatedTrack(store, 'tt1254207', 'pt-BR', 'pt.vtt', PT_VTT);

    const source = new LocalFileSubtitleSource(store);
    const primary = await source.fetchSubtitle({
      type: 'movie',
      videoId: 'tt1254207',
      language: 'en',
    });
    const secondary = await source.fetchSubtitle({
      type: 'movie',
      videoId: 'tt1254207',
      language: 'pt-BR',
    });

    expect(primary?.language).toBe('en');
    expect(primary?.format).toBe('srt');
    expect(secondary?.language).toBe('pt-BR');
    expect(secondary?.format).toBe('vtt');
  });

  it('returns empty subtitles when primary or secondary track is missing', async () => {
    const store = new CompanionSubtitleStore();
    addValidatedTrack(store, 'tt1254207', 'en', 'en.srt', EN_SRT);

    const handler = createSubtitlesHandler({
      sourceProvider: new LocalFileSubtitleSource(store),
      fileService: new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000' }),
    });

    // Secondary missing -> controlled empty response
    const missingSecondary = await handler({
      type: 'movie',
      id: 'tt1254207',
      config: { primaryLanguage: 'en', secondaryLanguage: 'pt-BR', bilingualEnabled: 'on' },
    });
    expect(missingSecondary.subtitles).toEqual([]);

    // Primary missing -> controlled empty response
    const missingPrimary = await handler({
      type: 'movie',
      id: 'tt1254207',
      config: { primaryLanguage: 'es', secondaryLanguage: 'en', bilingualEnabled: 'on' },
    });
    expect(missingPrimary.subtitles).toEqual([]);
  });

  it('never matches solely by filename across different content IDs and rejects unsupported languages', async () => {
    const store = new CompanionSubtitleStore();
    addValidatedTrack(store, 'tt1111111', 'en', 'shared-release.srt', EN_SRT);

    const source = new LocalFileSubtitleSource(store);

    // Different contentId with identical filename MUST NOT match
    const wrongContent = await source.fetchSubtitle({
      type: 'movie',
      videoId: 'tt9999999',
      language: 'en',
      filename: 'shared-release.srt',
    });
    expect(wrongContent).toBeNull();

    // Unsupported language returns null
    const badLang = await source.fetchSubtitle({
      type: 'movie',
      videoId: 'tt1111111',
      language: 'xx-invalid',
    });
    expect(badLang).toBeNull();
  });

  it('handles file removal and replaces duplicates cleanly without leaving stale entries', async () => {
    const store = new CompanionSubtitleStore();
    const id1 = addValidatedTrack(store, 'tt1254207', 'en', 'v1.srt', EN_SRT);
    const id2 = addValidatedTrack(
      store,
      'tt1254207',
      'en',
      'v2.srt',
      '1\n00:00:01,000 --> 00:00:03,000\nUpdated version.\n',
    );

    expect(id1).not.toBe(id2);
    expect(store.count()).toBe(1);

    const source = new LocalFileSubtitleSource(store);
    const fetched = await source.fetchSubtitle({
      type: 'movie',
      videoId: 'tt1254207',
      language: 'en',
    });
    expect(fetched?.content).toContain('Updated version.');

    // Remove and verify it returns null
    store.removeById(id2);
    const afterRemove = await source.fetchSubtitle({
      type: 'movie',
      videoId: 'tt1254207',
      language: 'en',
    });
    expect(afterRemove).toBeNull();
  });
});
