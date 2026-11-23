import { describe, expect, it } from 'vitest';
import { OpenSubtitlesSourceProvider } from '../src/index';

const MOCK_SRT = `1
00:00:01,000 --> 00:00:03,000
Official API subtitle line.
`;

describe('Sprint 10 — OpenSubtitles REST API v1 Opt-in Provider (Mocked Contract)', () => {
  it('stays disabled by default and makes zero network calls unless explicitly enabled', async () => {
    let called = false;
    const provider = new OpenSubtitlesSourceProvider({
      fetchFn: async () => {
        called = true;
        return new Response('{}', { status: 200 });
      },
    });

    const result = await provider.fetchSubtitle({
      type: 'movie',
      videoId: 'tt1254207',
      language: 'en',
    });

    expect(result).toBeNull();
    expect(called).toBe(false);
    expect(provider.getDiagnostics().lastStatus).toBe('DISABLED');
  });

  it('fetches and downloads a subtitle using official API v1 endpoints without leaking API key', async () => {
    const secretKey = 'test-user-secret-api-key-999';
    const seenUrls: string[] = [];

    const mockFetch: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      seenUrls.push(url);

      if (url.includes('/api/v1/subtitles?')) {
        const headers = init?.headers as Record<string, string>;
        expect(headers['Api-Key']).toBe(secretKey);
        return new Response(
          JSON.stringify({
            data: [
              {
                attributes: {
                  files: [{ file_id: 424242, file_name: 'episode.srt' }],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/api/v1/download')) {
        return new Response(
          JSON.stringify({ link: 'https://downloads.opensubtitles.com/temp/424242.srt' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url === 'https://downloads.opensubtitles.com/temp/424242.srt') {
        return new Response(MOCK_SRT, { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }

      return new Response('Not found', { status: 404 });
    };

    const provider = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: secretKey,
      fetchFn: mockFetch,
    });

    const asset = await provider.fetchSubtitle({
      type: 'series',
      videoId: 'tt0903747:1:2',
      language: 'pt-BR',
    });

    expect(asset).not.toBeNull();
    expect(asset?.sourceId).toBe('opensubtitles-424242');
    expect(asset?.language).toBe('pt-BR');
    expect(asset?.format).toBe('srt');
    expect(asset?.content).toContain('Official API subtitle line.');
    expect(JSON.stringify(asset)).not.toContain(secretKey);
    expect(seenUrls[0]).toContain('imdb_id=0903747');
    expect(seenUrls[0]).toContain('season_number=1');
    expect(seenUrls[0]).toContain('episode_number=2');
    expect(provider.getDiagnostics().lastStatus).toBe('ok');
  });

  it('handles 401 auth errors, 429 rate limits, timeouts, empty results, and malformed JSON gracefully', async () => {
    // 401 Auth error
    const authFail = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: 'bad-key',
      fetchFn: async () => new Response('Unauthorized', { status: 401 }),
    });
    expect(
      await authFail.fetchSubtitle({ type: 'movie', videoId: 'tt1254207', language: 'en' }),
    ).toBeNull();
    expect(authFail.getDiagnostics().lastStatus).toBe('AUTH_ERROR');

    // 429 Rate limit
    const rateLimited = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: 'valid-key',
      fetchFn: async () =>
        new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '30' } }),
    });
    expect(
      await rateLimited.fetchSubtitle({ type: 'movie', videoId: 'tt1254207', language: 'en' }),
    ).toBeNull();
    expect(rateLimited.getDiagnostics()).toEqual({
      lastStatus: 'RATE_LIMITED',
      retryAfterSeconds: 30,
    });

    // Timeout (AbortError)
    const timedOut = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: 'valid-key',
      timeoutMs: 10,
      fetchFn: async (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const abortErr = new Error('Aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        }),
    });
    expect(
      await timedOut.fetchSubtitle({ type: 'movie', videoId: 'tt1254207', language: 'en' }),
    ).toBeNull();
    expect(timedOut.getDiagnostics().lastStatus).toBe('TIMEOUT');

    // Empty results
    const empty = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: 'valid-key',
      fetchFn: async () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
    });
    expect(
      await empty.fetchSubtitle({ type: 'movie', videoId: 'tt1254207', language: 'en' }),
    ).toBeNull();
    expect(empty.getDiagnostics().lastStatus).toBe('NOT_FOUND');

    // Malformed JSON
    const malformed = new OpenSubtitlesSourceProvider({
      enabled: true,
      apiKey: 'valid-key',
      fetchFn: async () => new Response('{not-valid-json', { status: 200 }),
    });
    expect(
      await malformed.fetchSubtitle({ type: 'movie', videoId: 'tt1254207', language: 'en' }),
    ).toBeNull();
    expect(malformed.getDiagnostics().lastStatus).toBe('MALFORMED_RESPONSE');
  });
});
