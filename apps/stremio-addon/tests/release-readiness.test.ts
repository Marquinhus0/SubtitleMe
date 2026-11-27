import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  COMPANION_CSRF_HEADER,
  COMPANION_TOKEN_HEADER,
  CompanionPersistence,
  CompanionSubtitleStore,
  InMemoryKeyVault,
  assertNotSymlink,
  startStremioAddonServer,
  validateCompanionUpload,
} from '../src/index';

const EN_SRT = `1
00:00:01,000 --> 00:00:03,000
Release readiness English cue.
`;

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function getFreeLoopbackPort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (typeof addr === 'object' && addr) {
        const { port } = addr;
        srv.close(() => resolvePort(port));
      } else {
        srv.close(() => reject(new Error('Could not allocate free port')));
      }
    });
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('Sprint 12 — Release Readiness, Crash Recovery, Symlink Defense & Launchers', () => {
  it('cleans orphan .tmp.* files from interrupted writes while preserving valid persisted records', () => {
    const dataDir = createTempDir('subtitleme-s12-tmp-');
    const keyVault = new InMemoryKeyVault();
    const p1 = new CompanionPersistence({ enabled: true, dataDir, keyVault });
    const store1 = new CompanionSubtitleStore({ persistence: p1 });

    const up = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'en',
      filename: 'ok.srt',
      content: EN_SRT,
    });
    if (!up.ok) throw new Error(up.error);
    store1.upsert(up.value);

    // Simulate interrupted atomic writes leaving orphan .tmp.* files on disk
    writeFileSync(join(dataDir, 'index.json.tmp.deadbeef1234'), '{"partial', 'utf-8');
    writeFileSync(join(dataDir, 'orphan.srt.tmp.cafe12345678'), 'partial cue', 'utf-8');

    const p2 = new CompanionPersistence({ enabled: true, dataDir, keyVault });
    const recovery = p2.loadAll();
    expect(recovery.cleanedTempFiles).toBe(2);
    expect(recovery.records).toHaveLength(1);
    expect(p2.getStatus().cleanedTempFiles).toBe(2);

    const remainingFiles = readdirSync(dataDir);
    expect(remainingFiles.some((f) => f.includes('.tmp.'))).toBe(false);
  });

  it('rejects symbolic links inside Companion data directory to prevent symlink escapes', () => {
    const dataDir = createTempDir('subtitleme-s12-sym-');
    const outsideDir = createTempDir('subtitleme-s12-outside-');
    const outsideSecret = join(outsideDir, 'outside.srt');
    writeFileSync(outsideSecret, EN_SRT, 'utf-8');

    const symlinkName = '11111111-1111-1111-1111-111111111111.srt';
    const symlinkPath = join(dataDir, symlinkName);
    try {
      symlinkSync(outsideSecret, symlinkPath);
    } catch (err) {
      if (process.platform === 'win32' && (err as NodeJS.ErrnoException).code === 'EPERM') {
        return;
      }
      throw err;
    }

    expect(() => assertNotSymlink(symlinkPath)).toThrow(/symbolic links are not permitted/);

    // Index referencing the symlink must be skipped safely during recovery
    writeFileSync(
      join(dataDir, 'index.json'),
      JSON.stringify({
        version: 1,
        entries: [
          {
            id: 'local-11111111-1111-1111-1111-111111111111',
            contentId: 'tt1254207',
            associationKind: 'stremio-id',
            language: 'en',
            format: 'srt',
            filename: 'sneaky.srt',
            internalFile: symlinkName,
            byteLength: Buffer.byteLength(EN_SRT, 'utf-8'),
            cueCount: 1,
            uploadedAt: Date.now(),
          },
        ],
      }),
      'utf-8',
    );

    const p = new CompanionPersistence({ enabled: true, dataDir });
    const recovery = p.loadAll();
    expect(recovery.records).toEqual([]);
    expect(recovery.corruptedSkippedCount).toBe(1);
  });

  it('revokes active Companion session immediately via POST /companion/session/revoke', async () => {
    const running = await startStremioAddonServer({ port: 0 });
    try {
      const originalToken = running.companionAuth.getSessionToken();

      const revokeRes = await fetch(`${running.baseUrl}/companion/session/revoke`, {
        method: 'POST',
        headers: {
          Origin: running.baseUrl,
          [COMPANION_TOKEN_HEADER]: originalToken,
          [COMPANION_CSRF_HEADER]: '1',
        },
      });
      expect(revokeRes.status).toBe(200);

      // Original token MUST immediately fail with 401
      const staleRes = await fetch(`${running.baseUrl}/companion/subtitles`, {
        headers: { [COMPANION_TOKEN_HEADER]: originalToken },
      });
      expect(staleRes.status).toBe(401);

      // New rotated token works
      const newToken = running.companionAuth.getSessionToken();
      expect(newToken).not.toBe(originalToken);
      const freshRes = await fetch(`${running.baseUrl}/companion/subtitles`, {
        headers: { [COMPANION_TOKEN_HEADER]: newToken },
      });
      expect(freshRes.status).toBe(200);
    } finally {
      await running.close();
    }
  });

  it.skipIf(process.platform === 'win32')(
    'executes native Linux launcher start-companion.sh end-to-end and shuts down gracefully on SIGTERM',
    async () => {
    const port = await getFreeLoopbackPort();
    const dataDir = createTempDir('subtitleme-s12-linux-');
    const launcherPath = resolve(process.cwd(), 'apps/stremio-addon/bin/start-companion.sh');
    expect(existsSync(launcherPath)).toBe(true);

    const child = spawn('bash', [launcherPath], {
      env: {
        ...process.env,
        PORT: String(port),
        SUBTITLEME_PERSISTENCE: '1',
        SUBTITLEME_DATA_DIR: dataDir,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    try {
      // Wait for loopback /companion/health to become ready
      let healthy = false;
      const deadline = Date.now() + 8_000;
      while (Date.now() < deadline) {
        try {
          const res = await fetch(`http://127.0.0.1:${port}/companion/health`);
          if (res.ok) {
            const json = (await res.json()) as { ok: boolean; host: string; localOnly: boolean };
            if (json.ok && json.host === '127.0.0.1' && json.localOnly) {
              healthy = true;
              break;
            }
          }
        } catch {
          // Server still starting
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      expect(healthy).toBe(true);

      // Verify manifest is served from the launched Companion process
      const manifestRes = await fetch(`http://127.0.0.1:${port}/manifest.json`);
      expect(manifestRes.status).toBe(200);

      // Graceful SIGTERM shutdown
      const exitPromise = new Promise<number | null>((resolveExit) => {
        child.once('exit', (code) => resolveExit(code));
      });
      child.kill('SIGTERM');
      const exitCode = await exitPromise;
      expect(exitCode).toBe(0);
    } finally {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }
  },
  10_000,
  );

  it('verifies Windows PowerShell launcher script contract (static check only — native Windows is Not Evaluated)', () => {
    const ps1Path = resolve(process.cwd(), 'apps/stremio-addon/bin/start-companion.ps1');
    expect(existsSync(ps1Path)).toBe(true);
    const content = readFileSync(ps1Path, 'utf-8');
    expect(content).toContain('127.0.0.1');
    expect(content).toContain('Node.js 22+');
    expect(content).not.toContain('0.0.0.0');
  });
});
