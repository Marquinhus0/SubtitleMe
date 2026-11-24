import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isDirectExecution } from '../src/index';

describe('Sprint 15.2 — Cross-Platform Entrypoint Detection & Windows Launcher Contract', () => {
  it('detects direct execution accurately for standard, spaced, accented, and Unicode paths', () => {
    const cases = [
      resolve(process.cwd(), 'apps/stremio-addon/dist/index.mjs'),
      resolve(process.cwd(), 'dir with spaces/SubtitleMe Companion/dist/index.mjs'),
      resolve(process.cwd(), 'usuário ação café/SubtitleMe/dist/index.mjs'),
      resolve(process.cwd(), '日本語 テスト/字幕ツール/dist/index.mjs'),
    ];

    for (const filePath of cases) {
      const moduleUrl = pathToFileURL(filePath).href;
      expect(isDirectExecution(moduleUrl, filePath)).toBe(true);
    }
  });

  it('handles Windows drive-letter casing differences cleanly on win32', () => {
    const winPath = 'C:\\Users\\Test User\\SubtitleMe\\dist\\index.mjs';
    const moduleUrl = 'file:///C:/Users/Test%20User/SubtitleMe/dist/index.mjs';
    expect(isDirectExecution(moduleUrl, winPath.toLowerCase(), 'win32')).toBe(true);
  });

  it('returns false when imported as a module (different argv[1]) or when argv[1] is missing/blank', () => {
    const entryPath = resolve(process.cwd(), 'apps/stremio-addon/dist/index.mjs');
    const otherPath = resolve(process.cwd(), 'apps/stremio-addon/src/server/server.ts');
    const moduleUrl = pathToFileURL(entryPath).href;

    expect(isDirectExecution(moduleUrl, undefined)).toBe(false);
    expect(isDirectExecution(moduleUrl, '')).toBe(false);
    expect(isDirectExecution(moduleUrl, '   ')).toBe(false);
    expect(isDirectExecution(moduleUrl, otherPath)).toBe(false);
    expect(isDirectExecution('not-a-valid-file-url', entryPath)).toBe(false);
  });

  it('verifies Windows CMD and PowerShell launcher contracts (loopback-only, Node 22+, ExecutionPolicy docs)', () => {
    const ps1Path = resolve(process.cwd(), 'apps/stremio-addon/bin/start-companion.ps1');
    const cmdPath = resolve(process.cwd(), 'apps/stremio-addon/bin/start-companion.cmd');

    expect(existsSync(ps1Path)).toBe(true);
    expect(existsSync(cmdPath)).toBe(true);

    const ps1 = readFileSync(ps1Path, 'utf-8');
    expect(ps1).toContain('127.0.0.1');
    expect(ps1).toContain('Node.js 22+');
    expect(ps1).toContain('ExecutionPolicy');
    expect(ps1).toContain('start-companion.cmd');
    expect(ps1).not.toContain('Set-ExecutionPolicy');
    expect(ps1).not.toContain('0.0.0.0');

    const cmd = readFileSync(cmdPath, 'utf-8');
    expect(cmd).toContain('127.0.0.1');
    expect(cmd).toContain('Node.js 22+');
    expect(cmd).toContain('chcp 65001');
    expect(cmd).toContain('"%DIST_ENTRY%"');
    expect(cmd).not.toContain('0.0.0.0');
  });

  it('fails fast with non-zero exit code (never silent exit 0) when PORT is invalid on direct run', async () => {
    const distEntry = resolve(process.cwd(), 'apps/stremio-addon/dist/index.mjs');
    if (!existsSync(distEntry)) {
      return;
    }

    const result = await new Promise<{ code: number | null; stderr: string }>((resolveRun) => {
      const stderrChunks: string[] = [];
      const child = spawn(process.execPath, [distEntry], {
        env: { ...process.env, PORT: 'invalid-port' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk.toString('utf-8')));
      child.once('exit', (code) => resolveRun({ code, stderr: stderrChunks.join('') }));
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Invalid PORT');
  });
});
