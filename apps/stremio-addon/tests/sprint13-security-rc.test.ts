import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  CompanionPersistence,
  CompanionSubtitleStore,
  createAddonManifest,
  startStremioAddonServer,
  validateCompanionUpload,
} from '../src/index';

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:03,000
Sprint 13 Release Candidate cue.
`;

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
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

describe('Sprint 13 — Deep Security Audit, Paths With Spaces & Release Candidate Checks', () => {
  it('blocks unauthorized origins, missing CSRF, invalid tokens, and spoofed Hosts on POST /companion/session/revoke', async () => {
    const running = await startStremioAddonServer({ port: 0 });
    try {
      const token = running.companionAuth.getSessionToken();

      // 1. Foreign Origin -> 403 and session token MUST remain unchanged
      const evilOrigin = await fetch(`${running.baseUrl}/companion/session/revoke`, {
        method: 'POST',
        headers: {
          Origin: 'https://attacker.example',
          [COMPANION_TOKEN_HEADER]: token,
          [COMPANION_CSRF_HEADER]: '1',
        },
      });
      expect(evilOrigin.status).toBe(403);
      expect(running.companionAuth.getSessionToken()).toBe(token);

      // 2. Missing CSRF header -> 403 and session token MUST remain unchanged
      const noCsrf = await fetch(`${running.baseUrl}/companion/session/revoke`, {
        method: 'POST',
        headers: {
          Origin: running.baseUrl,
          [COMPANION_TOKEN_HEADER]: token,
        },
      });
      expect(noCsrf.status).toBe(403);
      expect(running.companionAuth.getSessionToken()).toBe(token);

      // 3. Invalid token -> 401 and session token MUST remain unchanged
      const badToken = await fetch(`${running.baseUrl}/companion/session/revoke`, {
        method: 'POST',
        headers: {
          Origin: running.baseUrl,
          [COMPANION_TOKEN_HEADER]: '0'.repeat(64),
          [COMPANION_CSRF_HEADER]: '1',
        },
      });
      expect(badToken.status).toBe(401);
      expect(running.companionAuth.getSessionToken()).toBe(token);

      // 4. Spoofed Host header (DNS rebinding) -> 403 and session token MUST remain unchanged
      const rebindStatus = await new Promise<number>((resolveStatus, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: running.port,
            path: '/companion/session/revoke',
            method: 'POST',
            headers: {
              Host: 'rebind.example.com',
              [COMPANION_TOKEN_HEADER]: token,
              [COMPANION_CSRF_HEADER]: '1',
            },
          },
          (res) => {
            res.resume();
            resolveStatus(res.statusCode ?? 0);
          },
        );
        req.on('error', reject);
        req.end();
      });
      expect(rebindStatus).toBe(403);
      expect(running.companionAuth.getSessionToken()).toBe(token);
    } finally {
      await running.close();
    }
  });

  it('persists and recovers cleanly in directories containing spaces and rejects symlinked index.json via O_NOFOLLOW', () => {
    const dirWithSpaces = createTempDir('SubtitleMe User Data ');
    const p1 = new CompanionPersistence({ enabled: true, dataDir: dirWithSpaces });
    const store1 = new CompanionSubtitleStore({ persistence: p1 });

    const up = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'en',
      filename: 'my movie sub.srt',
      content: SAMPLE_SRT,
    });
    if (!up.ok) throw new Error(up.error);
    store1.upsert(up.value);

    const p2 = new CompanionPersistence({ enabled: true, dataDir: dirWithSpaces });
    const recovery = p2.loadAll();
    expect(recovery.records).toHaveLength(1);
    expect(recovery.records[0]?.record.filename).toBe('my movie sub.srt');

    // Symlinked index.json pointing outside must be rejected atomically via O_NOFOLLOW (when OS allows symlinks)
    const symlinkDir = createTempDir('subtitleme-s13-idxsym-');
    const outsideDir = createTempDir('subtitleme-s13-ext-');
    const fakeIndex = join(outsideDir, 'index.json');
    writeFileSync(fakeIndex, JSON.stringify({ version: 1, entries: [] }), 'utf-8');
    let symlinkCreated = false;
    try {
      symlinkSync(fakeIndex, join(symlinkDir, 'index.json'));
      symlinkCreated = true;
    } catch (err) {
      if (process.platform !== 'win32' || (err as NodeJS.ErrnoException).code !== 'EPERM') {
        throw err;
      }
    }

    if (symlinkCreated) {
      const pSym = new CompanionPersistence({ enabled: true, dataDir: symlinkDir });
      const symRecovery = pSym.loadAll();
      expect(symRecovery.records).toEqual([]);
      expect(symRecovery.corruptedSkippedCount).toBe(1);
    }
  });

  it('verifies Release Candidate 1.0.0-rc.3 metadata consistency and Windows script space-safe quoting', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'apps/stremio-addon/package.json'), 'utf-8'),
    ) as { version: string };
    const manifest = createAddonManifest();

    expect(pkg.version).toBe('1.0.0-rc.3');
    expect(manifest.version).toBe('1.0.0-rc.3');

    const ps1 = readFileSync(
      resolve(process.cwd(), 'apps/stremio-addon/bin/start-companion.ps1'),
      'utf-8',
    );
    expect(ps1).toContain('.Path');
    expect(ps1).toContain('-LiteralPath');
    expect(ps1).toContain('"$DistEntry"');
    expect(ps1).toContain('"$RepoRoot"');
  });
});
