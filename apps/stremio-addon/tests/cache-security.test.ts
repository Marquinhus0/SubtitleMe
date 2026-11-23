import { describe, expect, it } from 'vitest';
import { GeneratedSubtitleCache, SubtitleFileService } from '../src/index';

const PRIMARY_ASSET = {
  sourceId: 'local-primary-1',
  language: 'en',
  format: 'srt' as const,
  content: '1\n00:00:01,000 --> 00:00:03,000\nHello\n',
};

const SECONDARY_ASSET = {
  sourceId: 'local-secondary-1',
  language: 'pt-BR',
  format: 'vtt' as const,
  content: 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nOlá\n',
};

const BASE_CONFIG = {
  primaryLanguage: 'en',
  secondaryLanguage: 'pt-BR',
  primaryOffsetMs: 0,
  secondaryOffsetMs: 0,
  order: 'primary-top' as const,
  bilingualEnabled: true,
};

describe('Sprint 10 — Cache Security, Opaque Tokens, LRU, Byte Cap & Session Isolation', () => {
  it('generates opaque random tokens and isolates different session scopes completely', () => {
    const cache = new GeneratedSubtitleCache();
    const service = new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000', cache });

    const sessionA = service.generateCombinedVtt(
      'tt1254207',
      PRIMARY_ASSET,
      SECONDARY_ASSET,
      BASE_CONFIG,
      'session-A',
    );
    const sessionB = service.generateCombinedVtt(
      'tt1254207',
      PRIMARY_ASSET,
      SECONDARY_ASSET,
      BASE_CONFIG,
      'session-B',
    );

    // Opaque 48-char random hex tokens (192-bit entropy) must never collide across sessions
    expect(sessionA.token).toMatch(/^[a-f0-9]{48}$/);
    expect(sessionB.token).toMatch(/^[a-f0-9]{48}$/);
    expect(sessionA.token).not.toBe(sessionB.token);
    expect(sessionB.fromCache).toBe(false);

    // Cross-session access check is blocked
    expect(service.getVttByToken(sessionA.token, 'session-A')).not.toBeNull();
    expect(service.getVttByToken(sessionA.token, 'session-B')).toBeNull();

    // Invalidating session A leaves session B intact
    expect(service.invalidateBySession('session-A')).toBe(1);
    expect(service.getVttByToken(sessionA.token)).toBeNull();
    expect(service.getVttByToken(sessionB.token, 'session-B')).not.toBeNull();
  });

  it('invalidates all derived VTT entries immediately when a source subtitle is removed', () => {
    const cache = new GeneratedSubtitleCache();
    const service = new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000', cache });

    const d1 = service.generateCombinedVtt(
      'tt1254207',
      PRIMARY_ASSET,
      SECONDARY_ASSET,
      BASE_CONFIG,
      'session-1',
    );
    const d2 = service.generateCombinedVtt(
      'tt1254207',
      PRIMARY_ASSET,
      SECONDARY_ASSET,
      { ...BASE_CONFIG, primaryOffsetMs: 300 },
      'session-1',
    );

    expect(cache.size()).toBe(2);
    const invalidated = service.invalidateBySourceId(PRIMARY_ASSET.sourceId);
    expect(invalidated).toBe(2);
    expect(service.getVttByToken(d1.token)).toBeNull();
    expect(service.getVttByToken(d2.token)).toBeNull();
  });

  it('enforces LRU eviction, byte budget, and TTL expiration', () => {
    let now = 10_000;
    const cache = new GeneratedSubtitleCache({
      ttlMs: 1_000,
      maxEntries: 2,
      maxTotalBytes: 120,
      nowProvider: () => now,
    });

    cache.set('t1', 'A'.repeat(40));
    cache.set('t2', 'B'.repeat(40));
    // Touch t1 so t2 becomes least recently used
    expect(cache.get('t1')).not.toBeNull();

    // Adding t3 evicts t2 (LRU)
    cache.set('t3', 'C'.repeat(40));
    expect(cache.get('t2')).toBeNull();
    expect(cache.get('t1')).not.toBeNull();
    expect(cache.get('t3')).not.toBeNull();

    // Adding 90-byte entry evicts older entries to stay <= 120 bytes
    cache.set('t4', 'D'.repeat(90));
    expect(cache.getTotalBytes()).toBeLessThanOrEqual(120);
    expect(cache.get('t4')).not.toBeNull();

    // Oversized single entry throws
    expect(() => cache.set('t5', 'E'.repeat(130))).toThrow(/maximum byte limit/);

    // TTL expiration clears remaining entries
    now += 1_500;
    expect(cache.get('t4')).toBeNull();
    expect(cache.size()).toBe(0);
  });
});
