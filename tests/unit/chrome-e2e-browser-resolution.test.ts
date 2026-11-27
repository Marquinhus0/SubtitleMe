import { describe, expect, it } from 'vitest';
import { resolveChromeExecutable } from '../e2e/chrome-extension.mjs';

describe('Sprint 21.3 (AUD-06) — Cross-Platform Chrome/Chromium E2E Resolver', () => {
  it('prioritizes a valid explicit CHROME_PATH over Playwright and system browsers', () => {
    const customPath = 'C:\\Custom Browsers\\My Chromium\\chrome.exe';
    const result = resolveChromeExecutable({
      platform: 'win32',
      env: { CHROME_PATH: customPath, LOCALAPPDATA: 'C:\\Users\\Alice\\AppData\\Local' },
      playwrightExecutablePath: 'C:\\Users\\Alice\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe',
      exists: (p: string) => p === customPath,
      isExecutable: (p: string) => p === customPath,
      readDir: () => [],
    });

    expect(result).toEqual({
      executablePath: customPath,
      source: 'env:CHROME_PATH',
    });
  });

  it('fails fast with a clear error when explicit CHROME_PATH does not exist or is not executable', () => {
    expect(() =>
      resolveChromeExecutable({
        platform: 'win32',
        env: { CHROME_PATH: 'C:\\NonExistent Folder\\chrome.exe' },
        playwrightExecutablePath: null,
        exists: () => false,
        isExecutable: () => false,
        readDir: () => [],
      }),
    ).toThrow(/CHROME_PATH is set to "C:\\NonExistent Folder\\chrome\.exe"/);
  });

  it('resolves Playwright Chromium via playwright API when available', () => {
    const pwPath = 'C:\\Users\\John Doe\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
    const result = resolveChromeExecutable({
      platform: 'win32',
      env: {},
      playwrightExecutablePath: pwPath,
      exists: (p: string) => p === pwPath,
      isExecutable: (p: string) => p === pwPath,
      readDir: () => [],
    });

    expect(result).toEqual({
      executablePath: pwPath,
      source: 'playwright:api',
    });
  });

  it('auto-detects newest Playwright Chromium revision in Windows %LOCALAPPDATA%\\ms-playwright with spaces', () => {
    const cacheDir = 'C:\\Users\\John Doe\\AppData\\Local\\ms-playwright';
    const older = `${cacheDir}\\chromium-1100\\chrome-win64\\chrome.exe`;
    const newer = `${cacheDir}\\chromium-1234\\chrome-win64\\chrome.exe`;
    const present = new Set([cacheDir, older, newer]);

    const result = resolveChromeExecutable({
      platform: 'win32',
      env: { LOCALAPPDATA: 'C:\\Users\\John Doe\\AppData\\Local' },
      homeDir: 'C:\\Users\\John Doe',
      playwrightExecutablePath: null,
      exists: (p: string) => present.has(p),
      isExecutable: (p: string) => p === older || p === newer,
      readDir: (d: string) => (d === cacheDir ? ['chromium-1100', 'ffmpeg-1011', 'chromium-1234'] : []),
    });

    expect(result).toEqual({
      executablePath: newer,
      source: 'playwright:cache',
    });
  });

  it('supports alternative executable names (chromium.exe on Windows, chromium on Linux)', () => {
    const winCache = 'C:\\Users\\Dev\\AppData\\Local\\ms-playwright';
    const winBin = `${winCache}\\chromium-1200\\chrome-win\\chromium.exe`;
    const winRes = resolveChromeExecutable({
      platform: 'win32',
      env: { LOCALAPPDATA: 'C:\\Users\\Dev\\AppData\\Local' },
      playwrightExecutablePath: null,
      exists: (p: string) => p === winCache || p === winBin,
      isExecutable: (p: string) => p === winBin,
      readDir: (d: string) => (d === winCache ? ['chromium-1200'] : []),
    });
    expect(winRes.executablePath).toBe(winBin);

    const linuxCache = '/home/john doe/.cache/ms-playwright';
    const linuxBin = `${linuxCache}/chromium-1200/chrome-linux/chromium`;
    const linuxRes = resolveChromeExecutable({
      platform: 'linux',
      env: {},
      homeDir: '/home/john doe',
      playwrightExecutablePath: null,
      exists: (p: string) => p === linuxCache || p === linuxBin,
      isExecutable: (p: string) => p === linuxBin,
      readDir: (d: string) => (d === linuxCache ? ['chromium-1200'] : []),
    });
    expect(linuxRes.executablePath).toBe(linuxBin);
  });

  it('preserves Linux /opt/ms-playwright and /usr/bin/* fallback resolution', () => {
    const optBin = '/opt/ms-playwright/chromium-1234/chrome-linux64/chrome';
    const optRes = resolveChromeExecutable({
      platform: 'linux',
      env: {},
      homeDir: '/home/tester',
      playwrightExecutablePath: null,
      exists: (p: string) => p === '/opt/ms-playwright' || p === optBin,
      isExecutable: (p: string) => p === optBin,
      readDir: (d: string) => (d === '/opt/ms-playwright' ? ['chromium-1234'] : []),
    });
    expect(optRes).toEqual({ executablePath: optBin, source: 'playwright:cache' });

    const sysBin = '/usr/bin/google-chrome-stable';
    const sysRes = resolveChromeExecutable({
      platform: 'linux',
      env: {},
      homeDir: '/home/tester',
      playwrightExecutablePath: null,
      exists: (p: string) => p === sysBin,
      isExecutable: (p: string) => p === sysBin,
      readDir: () => [],
    });
    expect(sysRes).toEqual({ executablePath: sysBin, source: 'system:fallback' });
  });

  it('throws an actionable error when no Chromium/Chrome executable is found', () => {
    expect(() =>
      resolveChromeExecutable({
        platform: 'linux',
        env: {},
        homeDir: '/home/empty',
        playwrightExecutablePath: null,
        exists: () => false,
        isExecutable: () => false,
        readDir: () => [],
      }),
    ).toThrow(/Chromium\/Chrome executable not found.*CHROME_PATH.*PLAYWRIGHT_BROWSERS_PATH.*npx playwright install chromium/);
  });
});
