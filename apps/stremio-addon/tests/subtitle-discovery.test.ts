import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  CompanionPersistence,
  CompanionSubtitleStore,
  GeneratedSubtitleCache,
  LocalDiscoveryProvider,
  OpenSubtitlesDiscoveryProvider,
  SubtitleDiscoveryOrchestrator,
  SubtitleFileService,
  createSubtitlesHandler,
  doesContentIdentityMatch,
  parseStremioContentId,
  startStremioAddonServer,
  validateCompanionUpload,
  type SubtitleDiscoveryProvider,
} from '../src/index';

const EN_SRT = `1
00:00:01,000 --> 00:00:04,000
Hello from English subtitle.

2
00:00:05,000 --> 00:00:08,000
Second English cue.
`;

const PT_VTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Olá da legenda em português!

2
00:00:05.000 --> 00:00:08.000
Segundo cue em português.
`;

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'subtitleme-s154-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function addLocalTrack(
  store: CompanionSubtitleStore,
  contentId: string,
  language: string,
  filename: string,
  content: string,
): string {
  const res = validateCompanionUpload({ contentId, language, filename, content });
  if (!res.ok) throw new Error(res.error);
  return store.upsert(res.value).id;
}

function createMockOpenSubtitlesFetch(options: {
  enContent?: string;
  ptContent?: string;
  failStatus?: number;
  retryAfter?: string;
  transientFailuresBeforeSuccess?: number;
}): { fetchFn: typeof fetch; downloadCount: () => number } {
  let downloads = 0;
  let transientAttempts = 0;

  const fetchFn: typeof fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (options.failStatus !== undefined) {
      return new Response('Error', {
        status: options.failStatus,
        ...(options.retryAfter ? { headers: { 'Retry-After': options.retryAfter } } : {}),
      });
    }

    if (
      options.transientFailuresBeforeSuccess !== undefined &&
      transientAttempts < options.transientFailuresBeforeSuccess &&
      url.includes('/subtitles?')
    ) {
      transientAttempts += 1;
      return new Response('Transient 503', { status: 503 });
    }

    if (url.includes('/subtitles?')) {
      const parsed = new URL(url);
      const lang = parsed.searchParams.get('languages') ?? '';
      const season = parsed.searchParams.get('season_number');
      const episode = parsed.searchParams.get('episode_number');
      const fileId = lang === 'en' ? 101 : lang === 'pt-br' ? 202 : 0;
      if (fileId === 0) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          data: [
            {
              attributes: {
                download_count: 5000,
                release: 'Official.Release',
                ...(season && episode
                  ? {
                      feature_details: {
                        season_number: Number(season),
                        episode_number: Number(episode),
                      },
                    }
                  : {}),
                files: [{ file_id: fileId, file_name: fileId === 101 ? 'en.srt' : 'pt.vtt' }],
              },
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (url.endsWith('/download')) {
      downloads += 1;
      return new Response(
        JSON.stringify({
          link:
            downloads % 2 === 1 && options.enContent
              ? 'https://downloads.opensubtitles.com/temp/101.srt'
              : 'https://downloads.opensubtitles.com/temp/202.vtt',
        }),
        { status: 200 },
      );
    }

    if (url.endsWith('/101.srt')) {
      return new Response(options.enContent ?? EN_SRT, { status: 200 });
    }
    if (url.endsWith('/202.vtt')) {
      return new Response(options.ptContent ?? PT_VTT, { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  };

  return { fetchFn, downloadCount: () => downloads };
}

describe('Sprint 15.4 — Content Identification, Discovery Architecture & All 20 Required Scenarios', () => {
  it('parses movies, series episodes (including URL-encoded colons), TMDB, Kitsu, and custom IDs accurately', () => {
    const movie = parseStremioContentId({ type: 'movie', id: 'tt1254207' });
    expect(movie).toMatchObject({
      canonicalId: 'tt1254207',
      mediaType: 'movie',
      namespace: 'imdb',
      imdbId: 'tt1254207',
    });

    const epEncoded = parseStremioContentId({ type: 'series', id: 'tt0903747%3A1%3A2' });
    expect(epEncoded).toMatchObject({
      rawId: 'tt0903747:1:2',
      canonicalId: 'tt0903747:1:2',
      mediaType: 'series',
      namespace: 'imdb',
      imdbId: 'tt0903747',
      season: 1,
      episode: 2,
    });

    const tmdb = parseStremioContentId({ type: 'movie', id: 'tmdb:10378' });
    expect(tmdb).toMatchObject({
      canonicalId: 'tmdb:10378',
      namespace: 'tmdb',
    });
    expect(tmdb?.imdbId).toBeUndefined();

    const kitsu = parseStremioContentId({ type: 'series', id: 'kitsu:7442:3' });
    expect(kitsu).toMatchObject({
      canonicalId: 'kitsu:7442:3',
      namespace: 'kitsu',
      season: 1,
      episode: 3,
    });

    // Strict non-mixing checks (Scenarios 7 & 8)
    expect(epEncoded).not.toBeNull();
    if (epEncoded && movie) {
      expect(doesContentIdentityMatch(epEncoded, { contentId: 'tt0903747:1:2' })).toBe(true);
      expect(doesContentIdentityMatch(epEncoded, { contentId: 'tt0903747:1:1' })).toBe(false);
      expect(doesContentIdentityMatch(epEncoded, { contentId: 'tt0903747' })).toBe(false);
      expect(doesContentIdentityMatch(movie, { contentId: 'tmdb:10378' })).toBe(false);
    }
  });

  it('Scenarios 1 & 2: resolves movie and series episode with two local sources', async () => {
    const store = new CompanionSubtitleStore();
    addLocalTrack(store, 'tt1254207', 'en', 'bbb-en.srt', EN_SRT);
    addLocalTrack(store, 'tt1254207', 'pt-BR', 'bbb-pt.vtt', PT_VTT);
    addLocalTrack(store, 'tt0903747:1:2', 'en', 'ep-en.srt', EN_SRT);
    addLocalTrack(store, 'tt0903747:1:2', 'pt-BR', 'ep-pt.vtt', PT_VTT);

    const orchestrator = new SubtitleDiscoveryOrchestrator([new LocalDiscoveryProvider(store)]);
    const fileService = new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000' });
    const handler = createSubtitlesHandler({ discoveryOrchestrator: orchestrator, fileService });

    const movieRes = await handler({ type: 'movie', id: 'tt1254207' });
    expect(movieRes.subtitles).toHaveLength(1);

    const episodeRes = await handler({ type: 'series', id: 'tt0903747%3A1%3A2' });
    expect(episodeRes.subtitles).toHaveLength(1);

    // Scenario 8: wrong episode returns empty
    const wrongEpRes = await handler({ type: 'series', id: 'tt0903747:1:3' });
    expect(wrongEpRes.subtitles).toEqual([]);
  });

  it('Scenarios 3 & 4: resolves movie with 1 local + 1 external and content with 2 external sources (with 5xx retry & download cache)', async () => {
    const store = new CompanionSubtitleStore();
    addLocalTrack(store, 'tt1254207', 'en', 'local-en.srt', EN_SRT);

    const mockApi = createMockOpenSubtitlesFetch({
      enContent: EN_SRT,
      ptContent: PT_VTT,
      transientFailuresBeforeSuccess: 1,
    });
    const osProvider = new OpenSubtitlesDiscoveryProvider({
      enabled: true,
      apiKey: 'mock-secret-key',
      maxRetries: 1,
      retryDelayMs: 1,
      fetchFn: mockApi.fetchFn,
    });

    const orchestrator = new SubtitleDiscoveryOrchestrator([
      new LocalDiscoveryProvider(store),
      osProvider,
    ]);

    // Scenario 3: 1 local (EN) + 1 external (PT-BR)
    const movieId = parseStremioContentId({ type: 'movie', id: 'tt1254207' });
    expect(movieId).not.toBeNull();
    if (!movieId) return;

    const mixed = await orchestrator.resolveBilingualAssets(movieId, 'en', 'pt-BR');
    expect(mixed.status).toBe('resolved');
    expect(mixed.primaryProvider).toBe('local-companion-discovery');
    expect(mixed.secondaryProvider).toBe('opensubtitles-rest-v1-discovery');

    // Scenario 4: 2 external sources for a different IMDb movie (not in local store)
    const extOnlyId = parseStremioContentId({ type: 'movie', id: 'tt0133093' });
    expect(extOnlyId).not.toBeNull();
    if (!extOnlyId) return;

    const extOnly = await orchestrator.resolveBilingualAssets(extOnlyId, 'en', 'pt-BR');
    expect(extOnly.status).toBe('resolved');
    expect(extOnly.primaryProvider).toBe('opensubtitles-rest-v1-discovery');
    expect(extOnly.secondaryProvider).toBe('opensubtitles-rest-v1-discovery');

    // Second resolution hits OpenSubtitles download cache (no extra /download quota burned)
    const countBefore = mockApi.downloadCount();
    await orchestrator.resolveBilingualAssets(extOnlyId, 'en', 'pt-BR');
    expect(mockApi.downloadCount()).toBe(countBefore);
  });

  it('Scenarios 5, 6, 7, 9, 10, 11, 12 & 13: handles missing languages, incompatible IDs, unavailable provider, 401, 429, timeout, and no match', async () => {
    const store = new CompanionSubtitleStore();
    addLocalTrack(store, 'tt1254207', 'en', 'en.srt', EN_SRT);

    const failingProvider: SubtitleDiscoveryProvider = {
      name: 'unavailable-provider',
      origin: 'external',
      async discover() {
        throw new Error('ECONNREFUSED');
      },
    };

    const orchestrator = new SubtitleDiscoveryOrchestrator([
      new LocalDiscoveryProvider(store),
      failingProvider,
    ]);
    const fileService = new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000' });
    const handler = createSubtitlesHandler({ discoveryOrchestrator: orchestrator, fileService });

    // Scenario 6: missing secondary -> empty (never fakes bilingual)
    expect((await handler({ type: 'movie', id: 'tt1254207' })).subtitles).toEqual([]);

    // Scenario 5: missing primary -> empty
    expect(
      (
        await handler({
          type: 'movie',
          id: 'tt1254207',
          config: { primaryLanguage: 'es', secondaryLanguage: 'en', bilingualEnabled: 'on' },
        })
      ).subtitles,
    ).toEqual([]);

    // Scenario 7 & 13: incompatible ID / no match -> empty
    expect((await handler({ type: 'movie', id: 'tmdb:999999' })).subtitles).toEqual([]);

    // Scenario 10: Invalid API key (401)
    const authErrProvider = new OpenSubtitlesDiscoveryProvider({
      enabled: true,
      apiKey: 'bad-key',
      fetchFn: createMockOpenSubtitlesFetch({ failStatus: 401 }).fetchFn,
    });
    const movieId = parseStremioContentId({ type: 'movie', id: 'tt1254207' });
    expect(movieId).not.toBeNull();
    if (!movieId) return;
    expect(await authErrProvider.discover(movieId, 'en')).toEqual([]);
    expect(authErrProvider.getDiagnostics().lastStatus).toBe('AUTH_ERROR');

    // Scenario 11: Rate limit (429 + Retry-After)
    const rateLimitProvider = new OpenSubtitlesDiscoveryProvider({
      enabled: true,
      apiKey: 'key',
      fetchFn: createMockOpenSubtitlesFetch({ failStatus: 429, retryAfter: '45' }).fetchFn,
    });
    expect(await rateLimitProvider.discover(movieId, 'en')).toEqual([]);
    expect(rateLimitProvider.getDiagnostics()).toEqual({
      lastStatus: 'RATE_LIMITED',
      retryAfterSeconds: 45,
    });

    // Scenario 12: Timeout (AbortError)
    const timeoutProvider = new OpenSubtitlesDiscoveryProvider({
      enabled: true,
      apiKey: 'key',
      timeoutMs: 10,
      maxRetries: 0,
      fetchFn: async (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const e = new Error('Timed out');
            e.name = 'AbortError';
            reject(e);
          });
        }),
    });
    expect(await timeoutProvider.discover(movieId, 'en')).toEqual([]);
    expect(timeoutProvider.getDiagnostics().lastStatus).toBe('TIMEOUT');
  });

  it('Scenarios 14–20: full Stremio protocol HTTP E2E, cache, deletion, persistence off/on, restart recovery, and concurrent session isolation', async () => {
    const dataDir = createTempDir();

    // Scenario 17: persistence disabled (memory-only)
    const memServer = await startStremioAddonServer({
      port: 0,
      persistenceOptions: { enabled: false, dataDir },
    });
    try {
      const h = {
        'Content-Type': 'application/json',
        Origin: memServer.baseUrl,
        [COMPANION_TOKEN_HEADER]: memServer.companionAuth.getSessionToken(),
        [COMPANION_CSRF_HEADER]: '1',
      };
      await fetch(`${memServer.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'en',
          filename: 'en.srt',
          content: EN_SRT,
        }),
      });
      expect(memServer.companionStore.count()).toBe(1);
    } finally {
      await memServer.close();
    }
    // Verify nothing was written to disk when persistence disabled
    const checkEmpty = new CompanionPersistence({ enabled: true, dataDir });
    expect(checkEmpty.loadAll().records).toHaveLength(0);

    // Scenario 18 & 16: persistence enabled + Companion restart recovery
    const s1 = await startStremioAddonServer({
      port: 0,
      persistenceOptions: { enabled: true, dataDir },
    });
    let epEnId: string;
    try {
      const h = {
        'Content-Type': 'application/json',
        Origin: s1.baseUrl,
        [COMPANION_TOKEN_HEADER]: s1.companionAuth.getSessionToken(),
        [COMPANION_CSRF_HEADER]: '1',
      };
      const r1 = await fetch(`${s1.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          contentId: 'tt0903747:1:2',
          language: 'en',
          filename: 'ep-en.srt',
          content: EN_SRT,
        }),
      });
      epEnId = ((await r1.json()) as { subtitle: { id: string } }).subtitle.id;

      await fetch(`${s1.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          contentId: 'tt0903747:1:2',
          language: 'pt-BR',
          filename: 'ep-pt.vtt',
          content: PT_VTT,
        }),
      });
    } finally {
      await s1.close();
    }

    // Restarted server recovers episode pair and serves real Stremio protocol request (Scenario 20)
    const s2 = await startStremioAddonServer({
      port: 0,
      persistenceOptions: { enabled: true, dataDir },
    });
    try {
      expect(s2.companionStore.count()).toBe(2);

      // Verify manifest has no restrictive idPrefixes
      const manifestRes = await fetch(`${s2.baseUrl}/manifest.json`);
      const manifestJson = (await manifestRes.json()) as { version: string; idPrefixes?: string[] };
      expect(manifestJson.version).toBe('1.0.1');
      expect(manifestJson.idPrefixes).toBeUndefined();

      // Stremio protocol request for URL-encoded series episode
      const subRes = await fetch(`${s2.baseUrl}/subtitles/series/tt0903747%3A1%3A2.json`);
      expect(subRes.status).toBe(200);
      expect(subRes.headers.get('access-control-allow-origin')).toBe('*');
      const subJson = (await subRes.json()) as {
        subtitles: Array<{ id: string; url: string; lang: string; label?: string }>;
      };
      expect(subJson.subtitles).toHaveLength(1);
      const vttUrl = subJson.subtitles[0]?.url ?? '';

      const vttRes = await fetch(vttUrl);
      expect(vttRes.status).toBe(200);
      expect(vttRes.headers.get('content-type')).toContain('text/vtt');
      const vttText = await vttRes.text();
      const parsed = parseSubtitle(vttText, 'vtt');
      expect(parsed.status).toBe('success');
      expect(vttText).toContain('Hello from English subtitle.');
      expect(vttText).toContain('Olá da legenda em português!');

      // Scenario 15: deleting source immediately invalidates derived VTT (404)
      const delRes = await fetch(
        `${s2.baseUrl}/companion/subtitles/${encodeURIComponent(epEnId)}`,
        {
          method: 'DELETE',
          headers: {
            Origin: s2.baseUrl,
            [COMPANION_TOKEN_HEADER]: s2.companionAuth.getSessionToken(),
            [COMPANION_CSRF_HEADER]: '1',
          },
        },
      );
      expect(delRes.status).toBe(200);
      expect((await fetch(vttUrl)).status).toBe(404);
    } finally {
      await s2.close();
    }

    // Scenarios 14 & 19: Cache + concurrent multi-session isolation
    const cache = new GeneratedSubtitleCache();
    const service = new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000', cache });
    const [dA, dB] = await Promise.all([
      Promise.resolve(
        service.generateCombinedVtt(
          'tt1254207',
          { sourceId: 's1', language: 'en', format: 'srt', content: EN_SRT },
          { sourceId: 's2', language: 'pt-BR', format: 'vtt', content: PT_VTT },
          {
            primaryLanguage: 'en',
            secondaryLanguage: 'pt-BR',
            primaryOffsetMs: 0,
            secondaryOffsetMs: 0,
            order: 'primary-top',
            bilingualEnabled: true,
          },
          'session-alpha',
        ),
      ),
      Promise.resolve(
        service.generateCombinedVtt(
          'tt1254207',
          { sourceId: 's1', language: 'en', format: 'srt', content: EN_SRT },
          { sourceId: 's2', language: 'pt-BR', format: 'vtt', content: PT_VTT },
          {
            primaryLanguage: 'en',
            secondaryLanguage: 'pt-BR',
            primaryOffsetMs: 0,
            secondaryOffsetMs: 0,
            order: 'primary-top',
            bilingualEnabled: true,
          },
          'session-beta',
        ),
      ),
    ]);
    expect(dA.token).not.toBe(dB.token);
    expect(service.getVttByToken(dA.token, 'session-beta')).toBeNull();
    expect(service.getVttByToken(dB.token, 'session-alpha')).toBeNull();
  });
});
