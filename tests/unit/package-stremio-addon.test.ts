import { describe, expect, it, vi } from 'vitest';
import {
  resolveNpmInvocation,
  runExternalCommand,
} from '../../scripts/package-stremio-addon.mjs';

describe('Sprint 21.3 (AUD-09) — DEP0190-Free Packaging Process Invocation', () => {
  it('resolves node.exe + npm-cli.js on Windows (including paths with spaces) without shell', () => {
    const execPath = 'C:\\Program Files\\nodejs\\node.exe';
    const expectedCli = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';

    const invocation = resolveNpmInvocation({
      platform: 'win32',
      execPath,
      env: {},
      exists: (p: string) => p === expectedCli,
    });

    expect(invocation).toEqual({
      command: execPath,
      argsPrefix: [expectedCli],
      mode: 'node-npm-cli',
    });
  });

  it('honors npm_execpath when pointing to npm-cli.js', () => {
    const execPath = 'C:\\Tools\\Node 24\\node.exe';
    const envCli = 'C:\\Custom Cache\\npm\\bin\\npm-cli.js';

    const invocation = resolveNpmInvocation({
      platform: 'win32',
      execPath,
      env: { npm_execpath: envCli },
      exists: (p: string) => p === envCli,
    });

    expect(invocation).toEqual({
      command: execPath,
      argsPrefix: [envCli],
      mode: 'node-npm-cli',
    });
  });

  it('throws a clear error on Windows if npm-cli.js cannot be located (never falls back to shell: true)', () => {
    expect(() =>
      resolveNpmInvocation({
        platform: 'win32',
        execPath: 'C:\\Program Files\\nodejs\\node.exe',
        env: {},
        exists: () => false,
      }),
    ).toThrow(/Could not locate npm-cli\.js alongside Node\.js/);
  });

  it('resolves direct npm or npm-cli.js on Linux without shell', () => {
    const direct = resolveNpmInvocation({
      platform: 'linux',
      execPath: '/usr/bin/node',
      env: {},
      exists: () => false,
    });
    expect(direct).toEqual({
      command: 'npm',
      argsPrefix: [],
      mode: 'direct-npm',
    });

    const posixCli = '/usr/local/lib/node_modules/npm/bin/npm-cli.js';
    const viaNode = resolveNpmInvocation({
      platform: 'linux',
      execPath: '/usr/local/bin/node',
      env: {},
      exists: (p: string) => p === posixCli,
    });
    expect(viaNode).toEqual({
      command: '/usr/local/bin/node',
      argsPrefix: [posixCli],
      mode: 'node-npm-cli',
    });
  });

  it('invokes external commands with shell: false, separate args, and preserves paths with spaces', () => {
    const mockExecFile = vi.fn();
    const spacedDir = 'C:\\Users\\John Doe\\AppData\\Local\\Temp\\subtitleme stage dir';
    const spacedArchive = 'C:\\Users\\John Doe\\My Releases\\subtitleme-stremio-v1.0.1.tar.gz';

    runExternalCommand('tar', ['-czf', spacedArchive, '-C', spacedDir, '.'], {
      cwd: spacedDir,
      stdio: 'pipe',
      execFile: mockExecFile,
    });

    expect(mockExecFile).toHaveBeenCalledTimes(1);
    expect(mockExecFile).toHaveBeenCalledWith(
      'tar',
      ['-czf', spacedArchive, '-C', spacedDir, '.'],
      expect.objectContaining({
        cwd: spacedDir,
        stdio: 'pipe',
        shell: false,
      }),
    );
  });

  it('propagates external command errors and non-zero exit status cleanly', () => {
    const failure = Object.assign(new Error('Command failed with exit code 42'), { status: 42 });
    const failingExecFile = vi.fn(() => {
      throw failure;
    });

    let caught: (Error & { status?: number }) | null = null;
    try {
      runExternalCommand('npm', ['install', '--omit=dev'], { execFile: failingExecFile });
    } catch (err) {
      caught = err as Error & { status?: number };
    }

    expect(caught).toBe(failure);
    expect(caught?.status).toBe(42);
  });
});
