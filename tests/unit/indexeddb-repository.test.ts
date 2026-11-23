import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  SubtitleStorageError,
  createIndexedDbSubtitleRepository,
  type LocalSubtitleRecord,
} from '@subtitleme/subtitle-storage';

function makeRecord(overrides: Partial<LocalSubtitleRecord> = {}): LocalSubtitleRecord {
  const now = Date.now();
  return {
    id: overrides.id ?? `rec-${Math.random().toString(36).slice(2, 8)}`,
    fileName: overrides.fileName ?? 'sample.srt',
    fileSize: overrides.fileSize ?? 512,
    format: overrides.format ?? 'srt',
    language: overrides.language ?? 'en',
    contentHash: overrides.contentHash ?? `hash-${Math.random().toString(36).slice(2, 10)}`,
    importedAt: overrides.importedAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    cueCount: overrides.cueCount ?? 2,
    durationMs: overrides.durationMs ?? 5000,
    cues: overrides.cues ?? [
      { id: '1', start: 1000, end: 2500, text: 'Hello' },
      { id: '2', start: 3000, end: 5000, text: 'World' },
    ],
  };
}

describe('IndexedDB LocalSubtitleRepository', () => {
  it('performs full CRUD, enforces unique contentHash duplicates, and tracks storage usage', async () => {
    const idbFactory = new IDBFactory();
    const repo = createIndexedDbSubtitleRepository({
      idbFactory,
      dbName: 'test-crud-db',
    });

    const rec1 = makeRecord({ id: 'r1', fileName: 'en.srt', contentHash: 'hash-en', importedAt: 100 });
    const rec2 = makeRecord({ id: 'r2', fileName: 'pt.vtt', format: 'vtt', language: 'pt-BR', contentHash: 'hash-pt', importedAt: 200 });

    await repo.saveSubtitle(rec1);
    await repo.saveSubtitle(rec2);

    // Duplicate contentHash must throw DUPLICATE_IMPORT
    await expect(
      repo.saveSubtitle(makeRecord({ id: 'r3', contentHash: 'hash-en' })),
    ).rejects.toMatchObject({ code: 'DUPLICATE_IMPORT' });

    const all = await repo.getAllSubtitles();
    expect(all.map((r) => r.id)).toEqual(['r2', 'r1']); // newest first

    const updated = await repo.updateSubtitle('r1', { language: 'es' });
    expect(updated.language).toBe('es');

    const usage = await repo.getStorageUsage();
    expect(usage.recordCount).toBe(2);
    expect(usage.totalCues).toBe(4);
    expect(usage.estimatedBytes).toBeGreaterThan(0);

    expect(await repo.deleteSubtitle('r1')).toBe(true);
    expect(await repo.getSubtitle('r1')).toBeNull();
    expect(await repo.deleteSubtitle('non-existent')).toBe(false);

    await repo.clearAllSubtitles();
    expect(await repo.getAllSubtitles()).toEqual([]);
    repo.close();
  });

  it('retains imported subtitle records across repository close and reopen (restart simulation)', async () => {
    const idbFactory = new IDBFactory();
    const repo1 = createIndexedDbSubtitleRepository({ idbFactory, dbName: 'test-restart-db' });
    await repo1.saveSubtitle(makeRecord({ id: 'persisted-1', fileName: 'movie-en.srt', contentHash: 'h1' }));
    repo1.close();

    const repo2 = createIndexedDbSubtitleRepository({ idbFactory, dbName: 'test-restart-db' });
    const loaded = await repo2.getSubtitle('persisted-1');
    expect(loaded?.fileName).toBe('movie-en.srt');
    expect(loaded?.cues).toHaveLength(2);
    repo2.close();
  });

  it('reports STORAGE_UNAVAILABLE cleanly when IndexedDB is missing', async () => {
    const repo = createIndexedDbSubtitleRepository({
      idbFactory: undefined as unknown as IDBFactory,
    });
    await expect(repo.getAllSubtitles()).rejects.toBeInstanceOf(SubtitleStorageError);
    await expect(repo.getAllSubtitles()).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
  });

  it('stores and retrieves a 3,000-cue subtitle track efficiently', async () => {
    const idbFactory = new IDBFactory();
    const repo = createIndexedDbSubtitleRepository({ idbFactory, dbName: 'test-perf-db' });
    const cues = Array.from({ length: 3000 }, (_, i) => ({
      id: String(i + 1),
      start: i * 2000,
      end: i * 2000 + 1500,
      text: `Subtitle cue line ${i + 1}`,
    }));
    const largeRecord = makeRecord({
      id: 'large-1',
      cueCount: cues.length,
      durationMs: 6_000_000,
      cues,
    });

    const t0 = performance.now();
    await repo.saveSubtitle(largeRecord);
    const loaded = await repo.getSubtitle('large-1');
    const elapsedMs = performance.now() - t0;

    expect(loaded?.cues).toHaveLength(3000);
    expect(elapsedMs).toBeLessThan(500);
    repo.close();
  });
});
