import { describe, expect, it } from 'vitest';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import {
  GeneratedSubtitleCache,
  MockFixtureSubtitleSource,
  SubtitleFileService,
  createAddonManifest,
  createSubtitlesHandler,
  startStremioAddonServer,
  validateAddonConfig,
  type SubtitleSourceProvider,
} from '../src/index';

describe('Sprint 09 — Stremio Addon Manifest & Config Validation', () => {
  it('produces a protocol-compliant Stremio Manifest with configurable subtitles resource', () => {
    const manifest = createAddonManifest();
    expect(manifest.id).toBe('com.subtitleme.addon');
    expect(manifest.resources).toEqual(['subtitles']);
    expect(manifest.types).toEqual(['movie', 'series']);
    expect(manifest.catalogs).toEqual([]);
    expect(manifest.behaviorHints?.configurable).toBe(true);
    expect(manifest.config?.map((c) => c.key)).toEqual([
      'primaryLanguage',
      'secondaryLanguage',
      'primaryOffsetMs',
      'secondaryOffsetMs',
      'order',
      'bilingualEnabled',
    ]);
  });

  it('validates valid string config payloads and rejects invalid, identical, or empty languages', () => {
    const validRes = validateAddonConfig({
      primaryLanguage: 'en',
      secondaryLanguage: 'pt-BR',
      primaryOffsetMs: '250',
      secondaryOffsetMs: '-150',
      order: 'secondary-top',
      bilingualEnabled: 'on',
    });
    expect(validRes.valid).toBe(true);
    expect(validRes.config).toEqual({
      primaryLanguage: 'en',
      secondaryLanguage: 'pt-BR',
      primaryOffsetMs: 250,
      secondaryOffsetMs: -150,
      order: 'secondary-top',
      bilingualEnabled: true,
    });

    // Identical languages rejected
    const sameLang = validateAddonConfig({
      primaryLanguage: 'en',
      secondaryLanguage: 'eng',
    });
    expect(sameLang.valid).toBe(false);
    expect(sameLang.errors.some((e) => e.includes('different'))).toBe(true);

    // Empty & unsupported languages + invalid offset
    const invalid = validateAddonConfig({
      primaryLanguage: '',
      secondaryLanguage: 'klingon',
      primaryOffsetMs: 'not-a-number',
      secondaryOffsetMs: '999999',
      order: 'diagonal',
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Sprint 09 — GeneratedSubtitleCache TTL, Capacity & Isolation', () => {
  it('caches entries, expires them after TTL, and isolates distinct configurations', () => {
    let fakeNow = 1_000_000;
    const cache = new GeneratedSubtitleCache({
      ttlMs: 5_000,
      maxEntries: 2,
      nowProvider: () => fakeNow,
    });

    cache.set('aaaabbbbccccdddd', 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nA\n');
    expect(cache.get('aaaabbbbccccdddd')?.vttContent).toContain('A');

    // Advance past TTL -> entry expires
    fakeNow += 6_000;
    expect(cache.get('aaaabbbbccccdddd')).toBeNull();
    expect(cache.size()).toBe(0);

    // Distinct configs produce distinct deterministic tokens
    const service = new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000', cache });
    const primary = {
      sourceId: 's1',
      language: 'en',
      format: 'srt' as const,
      content: '1\n00:00:01,000 --> 00:00:03,000\nHello\n',
    };
    const secondary = {
      sourceId: 's2',
      language: 'pt-BR',
      format: 'vtt' as const,
      content: 'WEBVTT\n\n1\n00:00:02.000 --> 00:00:04.000\nOlá\n',
    };

    const d1 = service.generateCombinedVtt('tt1', primary, secondary, {
      primaryLanguage: 'en',
      secondaryLanguage: 'pt-BR',
      primaryOffsetMs: 0,
      secondaryOffsetMs: 0,
      order: 'primary-top',
      bilingualEnabled: true,
    });
    const d2 = service.generateCombinedVtt('tt1', primary, secondary, {
      primaryLanguage: 'en',
      secondaryLanguage: 'pt-BR',
      primaryOffsetMs: 500,
      secondaryOffsetMs: 0,
      order: 'secondary-top',
      bilingualEnabled: true,
    });

    expect(d1.token).not.toBe(d2.token);
    expect(d1.fromCache).toBe(false);

    // Repeating exact same config hits cache
    const d1Repeat = service.generateCombinedVtt('tt1', primary, secondary, {
      primaryLanguage: 'en',
      secondaryLanguage: 'pt-BR',
      primaryOffsetMs: 0,
      secondaryOffsetMs: 0,
      order: 'primary-top',
      bilingualEnabled: true,
    });
    expect(d1Repeat.token).toBe(d1.token);
    expect(d1Repeat.fromCache).toBe(true);
  });
});

describe('Sprint 09 — Subtitles Handler Resilience', () => {
  it('returns empty subtitles gracefully when source provider throws an error', async () => {
    const failingSource: SubtitleSourceProvider = {
      name: 'failing-source',
      async fetchSubtitle() {
        throw new Error('Upstream provider timeout');
      },
    };
    const handler = createSubtitlesHandler({
      sourceProvider: failingSource,
      fileService: new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000' }),
    });

    const response = await handler({ type: 'movie', id: 'sm_poc_demo' });
    expect(response.subtitles).toEqual([]);
  });
});

describe('Sprint 09 — Local HTTP Proof of Concept (End-to-End)', () => {
  it('serves /manifest.json, /health, /subtitles/:type/:id.json, and valid combined WebVTT with CORS', async () => {
    const running = await startStremioAddonServer({
      port: 0,
      sourceProvider: new MockFixtureSubtitleSource(),
    });

    try {
      // 1. Health check
      const healthRes = await fetch(`${running.baseUrl}/health`);
      expect(healthRes.status).toBe(200);
      expect(healthRes.headers.get('access-control-allow-origin')).toBe('*');

      // 2. Manifest endpoint via official stremio-addon-sdk router
      const manifestRes = await fetch(`${running.baseUrl}/manifest.json`);
      expect(manifestRes.status).toBe(200);
      expect(manifestRes.headers.get('access-control-allow-origin')).toBe('*');
      const manifestJson = (await manifestRes.json()) as { id: string; resources: string[] };
      expect(manifestJson.id).toBe('com.subtitleme.addon');
      expect(manifestJson.resources).toEqual(['subtitles']);

      // 3. Subtitles handler request for authorial PoC fixture (SRT + VTT overlapping cues)
      const subRes = await fetch(`${running.baseUrl}/subtitles/movie/sm_poc_demo.json`);
      expect(subRes.status).toBe(200);
      const subJson = (await subRes.json()) as {
        subtitles: Array<{ id: string; url: string; lang: string; label?: string }>;
      };
      expect(subJson.subtitles).toHaveLength(1);
      const item = subJson.subtitles[0];
      expect(item?.lang).toBe('eng');
      expect(item?.label).toBe('SubtitleMe — English + Portuguese (Brazil)');
      expect(item?.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/generated\/[a-f0-9]{32,64}\.vtt$/);

      // 4. Fetch the generated combined WebVTT file over HTTP and verify parsed cues
      const vttRes = await fetch(item?.url ?? '');
      expect(vttRes.status).toBe(200);
      expect(vttRes.headers.get('content-type')).toContain('text/vtt');
      expect(vttRes.headers.get('access-control-allow-origin')).toBe('*');

      const vttText = await vttRes.text();
      const parsed = parseSubtitle(vttText, 'vtt');
      expect(parsed.status).toBe('success');
      // Overlapping segments: 1..2s EN only, 2..4s EN+PT, 4..5s PT only, 5..8.5s EN+PT, 8.5..9s PT only
      expect(parsed.cues).toHaveLength(5);
      expect(parsed.cues[1]?.text).toBe(
        'Hello! Welcome to SubtitleMe.\nOlá! Bem-vindo ao SubtitleMe.',
      );

      // 5. Missing/non-existent generated file returns 404
      const missingRes = await fetch(
        `${running.baseUrl}/generated/00000000000000000000000000000000.vtt`,
      );
      expect(missingRes.status).toBe(404);
    } finally {
      await running.close();
    }
  });
});
