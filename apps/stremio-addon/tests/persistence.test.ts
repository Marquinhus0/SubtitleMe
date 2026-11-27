import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  CompanionPersistence,
  CompanionSubtitleStore,
  InMemoryKeyVault,
  assertPathInsideDir,
  startStremioAddonServer,
  validateCompanionUpload,
} from '../src/index';

const EN_SRT = `1
00:00:01,000 --> 00:00:03,500
Persisted English line.
`;

const PT_VTT = `WEBVTT

1
00:00:01.000 --> 00:00:03.500
Linha persistida em português.
`;

const tempDirs: string[] = [];

function createTempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'subtitleme-s11-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('Sprint 11 — Optional Local Persistence & Recovery', () => {
  it('persists SRT/VTT atomically under random internal filenames, recovers after restart, and supports replace/delete/clear', () => {
    const dataDir = createTempDataDir();
    const keyVault = new InMemoryKeyVault();

    // Session 1: persist two tracks
    const p1 = new CompanionPersistence({ enabled: true, dataDir, keyVault });
    const store1 = new CompanionSubtitleStore({ persistence: p1 });

    const upEn = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'en',
      filename: 'user-original-name.srt',
      content: EN_SRT,
    });
    const upPt = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'pt-BR',
      filename: 'legenda-pt.vtt',
      content: PT_VTT,
    });
    expect(upEn.ok && upPt.ok).toBe(true);
    if (!upEn.ok || !upPt.ok) return;

    const sEn = store1.upsert(upEn.value);
    const sPt = store1.upsert(upPt.value);

    // Verify internal files are random UUIDs, never client filenames, and no .tmp leftovers exist
    const filesOnDisk = readdirSync(dataDir);
    expect(filesOnDisk).toContain('index.json');
    expect(filesOnDisk.some((f) => f.includes('user-original-name'))).toBe(false);
    expect(filesOnDisk.some((f) => f.includes('.tmp.'))).toBe(false);
    expect(filesOnDisk.filter((f) => /\.(srt|vtt)$/.test(f))).toHaveLength(2);

    // Session 2: simulate full Companion restart -> index rebuilt automatically
    const p2 = new CompanionPersistence({ enabled: true, dataDir, keyVault });
    const store2 = new CompanionSubtitleStore({ persistence: p2 });
    expect(store2.count()).toBe(2);
    expect(p2.getStatus().recoveredCount).toBe(2);
    expect(store2.findByContentAndLanguage('tt1254207', 'en')?.filename).toBe(
      'user-original-name.srt',
    );
    expect(store2.findByContentAndLanguage('tt1254207', 'pt-BR')?.content).toContain(
      'Linha persistida em português.',
    );

    // Replace EN track -> old file removed, count stays 2
    const upEnV2 = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'en',
      filename: 'en-v2.srt',
      content: '1\n00:00:01,000 --> 00:00:02,000\nReplaced EN.\n',
    });
    expect(upEnV2.ok).toBe(true);
    if (!upEnV2.ok) return;
    store2.upsert(upEnV2.value);
    expect(store2.count()).toBe(2);
    expect(store2.getById(sEn.id)).toBeNull();

    // Delete PT track -> removed from memory & disk
    expect(store2.removeById(sPt.id)).toBe(true);
    expect(store2.count()).toBe(1);

    // Clear all -> disk cleaned
    store2.clear();
    expect(store2.count()).toBe(0);
    expect(p2.getStatus().usedBytes).toBe(0);
  });

  it('handles corrupted index.json and corrupted subtitle files safely without crashing', () => {
    const dataDir = createTempDataDir();
    const keyVault = new InMemoryKeyVault();

    // 1. Corrupted JSON index -> recovers 0 gracefully
    writeFileSync(join(dataDir, 'index.json'), '{not-valid-json', 'utf-8');
    const pCorrupt = new CompanionPersistence({ enabled: true, dataDir, keyVault });
    const resCorrupt = pCorrupt.loadAll();
    expect(resCorrupt.records).toEqual([]);
    expect(resCorrupt.corruptedSkippedCount).toBe(1);

    // 2. Valid index with 1 good file + 1 missing/corrupt file -> skips bad, keeps good
    const dataDir2 = createTempDataDir();
    const pGood = new CompanionPersistence({ enabled: true, dataDir: dataDir2, keyVault });
    const store = new CompanionSubtitleStore({ persistence: pGood });
    const up = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'en',
      filename: 'ok.srt',
      content: EN_SRT,
    });
    if (!up.ok) throw new Error(up.error);
    store.upsert(up.value);

    // Inject a corrupted entry into the encrypted index.json alongside the valid one
    const raw = pGood.readEncryptedJsonFile<{ version: number; entries: unknown[] }>('index.json', 'index');
    expect(raw).not.toBeNull();
    if (!raw) throw new Error('Expected readable encrypted index');
    raw.entries.push({
      id: 'local-11111111-1111-1111-1111-111111111111',
      contentId: 'tt9999999',
      associationKind: 'stremio-id',
      language: 'en',
      format: 'srt',
      filename: 'missing.srt',
      internalFile: '22222222-2222-2222-2222-222222222222.srt',
      byteLength: 50,
      cueCount: 1,
      uploadedAt: Date.now(),
    });
    pGood.writeEncryptedJsonFile('index.json', 'index', raw);

    const pRestart = new CompanionPersistence({ enabled: true, dataDir: dataDir2, keyVault });
    const storeRestart = new CompanionSubtitleStore({ persistence: pRestart });
    expect(storeRestart.count()).toBe(1);
    expect(pRestart.getStatus().corruptedSkippedCount).toBe(1);
  });

  it('enforces storage quota and blocks path traversal attempts', () => {
    const dataDir = createTempDataDir();
    expect(() => assertPathInsideDir(dataDir, join(dataDir, '..', 'escape.srt'))).toThrow(
      /path traversal/,
    );

    const pSmall = new CompanionPersistence({
      enabled: true,
      dataDir,
      keyVault: new InMemoryKeyVault(),
      maxStorageBytes: 60, // smaller than EN_SRT + PT_VTT combined
    });
    const store = new CompanionSubtitleStore({ persistence: pSmall });

    const up1 = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'en',
      filename: 'en.srt',
      content: EN_SRT,
    });
    const up2 = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'pt-BR',
      filename: 'pt.vtt',
      content: PT_VTT,
    });
    if (!up1.ok || !up2.ok) throw new Error('Expected valid fixtures');

    store.upsert(up1.value);
    expect(() => store.upsert(up2.value)).toThrow(/storage limit exceeded/);
    expect(store.count()).toBe(1);
  });

  it('recovers subtitles across full HTTP server restart, serves combined VTT, and invalidates on delete', async () => {
    const dataDir = createTempDataDir();
    const keyVault = new InMemoryKeyVault();

    // Server instance 1: enable persistence via consent endpoint & upload pair
    const s1 = await startStremioAddonServer({
      port: 0,
      persistenceOptions: { enabled: false, dataDir, keyVault },
    });
    let primaryId: string;
    try {
      const headers1 = {
        'Content-Type': 'application/json',
        Origin: s1.baseUrl,
        [COMPANION_TOKEN_HEADER]: s1.companionAuth.getSessionToken(),
        [COMPANION_CSRF_HEADER]: '1',
      };

      const consentRes = await fetch(`${s1.baseUrl}/companion/storage/consent`, {
        method: 'POST',
        headers: headers1,
        body: JSON.stringify({ enabled: true }),
      });
      expect(consentRes.status).toBe(200);

      const up1 = await fetch(`${s1.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers: headers1,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'en',
          filename: 'en.srt',
          content: EN_SRT,
        }),
      });
      expect(up1.status).toBe(201);
      primaryId = ((await up1.json()) as { subtitle: { id: string } }).subtitle.id;

      const up2 = await fetch(`${s1.baseUrl}/companion/subtitles`, {
        method: 'POST',
        headers: headers1,
        body: JSON.stringify({
          contentId: 'tt1254207',
          language: 'pt-BR',
          filename: 'pt.vtt',
          content: PT_VTT,
        }),
      });
      expect(up2.status).toBe(201);
    } finally {
      await s1.close();
    }

    // Server instance 2: fresh server pointing at same dataDir -> recovers both tracks!
    const s2 = await startStremioAddonServer({
      port: 0,
      persistenceOptions: { enabled: true, dataDir, keyVault },
    });
    try {
      expect(s2.companionStore.count()).toBe(2);
      expect(s2.persistence.getStatus().recoveredCount).toBe(2);

      // Stremio requests subtitles immediately after restart without re-uploading
      const subRes = await fetch(`${s2.baseUrl}/subtitles/movie/tt1254207.json`);
      expect(subRes.status).toBe(200);
      const subJson = (await subRes.json()) as { subtitles: Array<{ url: string }> };
      expect(subJson.subtitles).toHaveLength(1);

      const vttUrl = subJson.subtitles[0]?.url ?? '';
      const vttRes = await fetch(vttUrl);
      expect(vttRes.status).toBe(200);
      expect(await vttRes.text()).toContain('Linha persistida em português.');

      // Delete recovered track -> derived VTT immediately returns 404
      const delRes = await fetch(
        `${s2.baseUrl}/companion/subtitles/${encodeURIComponent(primaryId)}`,
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

      const afterDeleteVtt = await fetch(vttUrl);
      expect(afterDeleteVtt.status).toBe(404);
    } finally {
      await s2.close();
    }
  });
});
