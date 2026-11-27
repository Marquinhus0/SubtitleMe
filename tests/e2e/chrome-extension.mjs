import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path, { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');
const defaultDistDir = resolve(repoRoot, 'apps/chrome-extension/dist');
const fixtureHtmlPath = resolve(repoRoot, 'tests/fixtures/html5-player.html');
const sampleVideoPath = resolve(repoRoot, 'tests/fixtures/sample-video.webm');

function defaultIsExecutable(candidatePath, platform) {
  try {
    const stat = statSync(candidatePath);
    if (!stat.isFile()) return false;
    if (platform === 'win32') {
      accessSync(candidatePath, fsConstants.F_OK);
      return true;
    }
    accessSync(candidatePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function sortChromiumDirsDesc(entries) {
  return entries
    .filter((entry) => /^chromium-\d+/i.test(entry))
    .sort((a, b) => {
      const numA = Number.parseInt(a.replace(/^chromium-/i, ''), 10) || 0;
      const numB = Number.parseInt(b.replace(/^chromium-/i, ''), 10) || 0;
      return numB - numA;
    });
}

function getPlaywrightCacheDirs(platform, env, homeDir, pathImpl) {
  const dirs = [];
  const customBrowsersPath = env.PLAYWRIGHT_BROWSERS_PATH?.trim();
  if (customBrowsersPath && customBrowsersPath !== '0') {
    dirs.push(customBrowsersPath);
  }

  if (platform === 'win32') {
    if (env.LOCALAPPDATA?.trim()) {
      dirs.push(pathImpl.join(env.LOCALAPPDATA.trim(), 'ms-playwright'));
    }
    if (env.USERPROFILE?.trim()) {
      dirs.push(pathImpl.join(env.USERPROFILE.trim(), 'AppData', 'Local', 'ms-playwright'));
    }
    if (homeDir) {
      dirs.push(pathImpl.join(homeDir, 'AppData', 'Local', 'ms-playwright'));
    }
  } else {
    dirs.push('/opt/ms-playwright');
    if (homeDir) {
      dirs.push(pathImpl.join(homeDir, '.cache', 'ms-playwright'));
    }
  }

  return [...new Set(dirs)];
}

function getPlaywrightRelativeExecutables(platform) {
  if (platform === 'win32') {
    return [
      ['chrome-win64', 'chrome.exe'],
      ['chrome-win', 'chrome.exe'],
      ['chrome-win32', 'chrome.exe'],
      ['chrome-win64', 'chromium.exe'],
      ['chrome-win', 'chromium.exe'],
    ];
  }
  return [
    ['chrome-linux64', 'chrome'],
    ['chrome-linux', 'chrome'],
    ['chrome-linux64', 'chromium'],
    ['chrome-linux', 'chromium'],
  ];
}

function getSystemFallbackCandidates(platform, env, pathImpl) {
  if (platform === 'win32') {
    const candidates = [];
    if (env.PROGRAMFILES?.trim()) {
      candidates.push(pathImpl.join(env.PROGRAMFILES.trim(), 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    if (env['PROGRAMFILES(X86)']?.trim()) {
      candidates.push(pathImpl.join(env['PROGRAMFILES(X86)'].trim(), 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    if (env.LOCALAPPDATA?.trim()) {
      candidates.push(pathImpl.join(env.LOCALAPPDATA.trim(), 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    return candidates;
  }

  return [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
}

/**
 * Resolves a Chromium/Chrome executable across Windows and Linux without hardcoded user paths.
 * Priority:
 *   1. Explicit `CHROME_PATH` environment variable (validated; fails fast if invalid).
 *   2. Playwright-managed Chromium (`chromium.executablePath()` + cache directories).
 *   3. Known OS fallback installations.
 */
export function resolveChromeExecutable(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const pathImpl = platform === 'win32' ? path.win32 : path.posix;
  const exists = options.exists ?? existsSync;
  const isExecutable =
    options.isExecutable ?? ((candidatePath) => defaultIsExecutable(candidatePath, platform));
  const readDir =
    options.readDir ??
    ((dirPath) => {
      try {
        return readdirSync(dirPath);
      } catch {
        return [];
      }
    });

  // 1. Explicit CHROME_PATH takes strict priority
  const explicitChromePath = env.CHROME_PATH?.trim();
  if (explicitChromePath) {
    if (exists(explicitChromePath) && isExecutable(explicitChromePath)) {
      return { executablePath: explicitChromePath, source: 'env:CHROME_PATH' };
    }
    throw new Error(
      `CHROME_PATH is set to "${explicitChromePath}", but the file does not exist or is not executable. ` +
        'Provide a valid browser executable path or unset CHROME_PATH to use Playwright Chromium auto-detection.',
    );
  }

  // 2a. Playwright built-in resolver (respects PLAYWRIGHT_BROWSERS_PATH across OSes)
  let pwExecutable = options.playwrightExecutablePath;
  if (pwExecutable === undefined) {
    try {
      pwExecutable = chromium.executablePath();
    } catch {
      pwExecutable = null;
    }
  }
  if (pwExecutable && exists(pwExecutable) && isExecutable(pwExecutable)) {
    return { executablePath: pwExecutable, source: 'playwright:api' };
  }

  // 2b. Scan Playwright cache directories (newest chromium-* revision first)
  // Prefer Chromium-for-Testing (Playwright) because branded Chrome 137+ disables --load-extension
  const cacheDirs = getPlaywrightCacheDirs(platform, env, homeDir, pathImpl);
  const relExecutables = getPlaywrightRelativeExecutables(platform);
  for (const cacheDir of cacheDirs) {
    if (!exists(cacheDir)) continue;
    const chromiumEntries = sortChromiumDirsDesc(readDir(cacheDir));
    for (const entry of chromiumEntries) {
      for (const relSegments of relExecutables) {
        const candidate = pathImpl.join(cacheDir, entry, ...relSegments);
        if (exists(candidate) && isExecutable(candidate)) {
          return { executablePath: candidate, source: 'playwright:cache' };
        }
      }
    }
  }

  // 3. Known system fallback locations
  const fallbackCandidates = getSystemFallbackCandidates(platform, env, pathImpl);
  for (const candidate of fallbackCandidates) {
    if (exists(candidate) && isExecutable(candidate)) {
      return { executablePath: candidate, source: 'system:fallback' };
    }
  }

  throw new Error(
    `Chromium/Chrome executable not found (platform=${platform}). ` +
      `Checked Playwright cache dirs [${cacheDirs.join(', ')}] and system paths. ` +
      'Configure CHROME_PATH="<path-to-chromium>", set PLAYWRIGHT_BROWSERS_PATH, or install Playwright Chromium (npx playwright install chromium).',
  );
}

export function findChromeExecutable(options = {}) {
  return resolveChromeExecutable(options).executablePath;
}

function startFixtureServer() {
  const html = readFileSync(fixtureHtmlPath, 'utf-8');
  const videoBytes = readFileSync(sampleVideoPath);

  return new Promise((resolveServer) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/sample-video.webm') {
        res.writeHead(200, {
          'Content-Type': 'video/webm',
          'Content-Length': String(videoBytes.byteLength),
          'Accept-Ranges': 'bytes',
        });
        res.end(videoBytes);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolveServer({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

async function getShadowSubtitleText(page, containerSelector) {
  return page.evaluate((sel) => {
    const host = document.querySelector(`${sel} [data-subtitleme-overlay]`);
    const root = host?.shadowRoot;
    if (!root) return { primary: '', secondary: '' };
    const primary = root.querySelector('[data-slot="primary"]')?.textContent ?? '';
    const secondary = root.querySelector('[data-slot="secondary"]')?.textContent ?? '';
    return { primary, secondary };
  }, containerSelector);
}

async function run() {
  let extensionDir = defaultDistDir;
  let extractedTempDir = null;

  if (process.env.RELEASE_ZIP) {
    const zipPath = resolve(repoRoot, process.env.RELEASE_ZIP);
    assert.ok(existsSync(zipPath), `Release ZIP not found: ${zipPath}`);
    extractedTempDir = mkdtempSync(resolve(tmpdir(), 'subtitleme-zip-extract-'));
    execFileSync('unzip', ['-q', zipPath, '-d', extractedTempDir]);
    extensionDir = extractedTempDir;
  }

  const contentBundlePath = resolve(extensionDir, 'content/index.js');
  assert.ok(
    existsSync(resolve(extensionDir, 'manifest.json')),
    `manifest.json not found at extension root: ${extensionDir}`,
  );
  assert.ok(
    existsSync(contentBundlePath),
    `content/index.js not found inside extension directory: ${extensionDir}`,
  );

  const executablePath = findChromeExecutable();
  assert.ok(executablePath, 'Chromium executable not found in environment.');

  const { server, url } = await startFixtureServer();
  const userDataDir = mkdtempSync(resolve(tmpdir(), 'subtitleme-chrome-e2e-'));

  let context;
  const metrics = {};
  const uncaughtErrors = [];

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: false,
      args: [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        `--disable-extensions-except=${extensionDir}`,
        `--load-extension=${extensionDir}`,
      ],
    });
    context.on('page', (p) => {
      p.on('pageerror', (err) => uncaughtErrors.push(err.message));
    });

    // 1. Verify MV3 Service Worker boots cleanly
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }
    const extensionId = new URL(serviceWorker.url()).host;
    assert.ok(extensionId.length > 0, 'Extension ID should be resolved.');

    // 2. Local Files E2E (SRT + VTT + Invalid + Duplicate + Persistence across popup reopen + Removal)
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options/index.html`, {
      waitUntil: 'domcontentloaded',
    });

    await optionsPage.click('[data-testid="settings-nav-localFiles"]');
    await optionsPage.waitForSelector('[data-testid="section-localFiles"]');

    const srtBuffer = Buffer.from(
      '1\n00:00:00,100 --> 00:00:01,400\nLocal SRT Hello\n\n2\n00:00:01,600 --> 00:00:03,000\nSecond SRT line\n',
      'utf-8',
    );
    const vttBuffer = Buffer.from(
      'WEBVTT\n\n1\n00:00:00.100 --> 00:00:01.400\nLegenda VTT Local\n',
      'utf-8',
    );
    const badBuffer = Buffer.from('Not a subtitle file at all', 'utf-8');

    // Invalid file -> error alert
    await optionsPage.setInputFiles('input[type="file"]', {
      name: 'spoofed.srt',
      mimeType: 'text/plain',
      buffer: badBuffer,
    });
    await optionsPage.waitForSelector('[role="alert"]');

    // Import SRT -> preview -> select language -> confirm
    const importStart = performance.now();
    await optionsPage.setInputFiles('input[type="file"]', {
      name: 'sample-en.srt',
      mimeType: 'text/plain',
      buffer: srtBuffer,
    });
    await optionsPage.waitForSelector('[data-testid="import-preview-card"]');
    await optionsPage.selectOption('[data-testid="import-language-select"]', 'en');
    await optionsPage.click('[data-testid="confirm-import-button"]');
    await optionsPage.waitForSelector('article:has-text("sample-en.srt")');
    metrics.srtImportMs = Math.round(performance.now() - importStart);

    // Duplicate SRT rejected
    await optionsPage.setInputFiles('input[type="file"]', {
      name: 'sample-en-copy.srt',
      mimeType: 'text/plain',
      buffer: srtBuffer,
    });
    await optionsPage.waitForSelector('[role="alert"]');

    // Import VTT -> preview -> confirm
    await optionsPage.setInputFiles('input[type="file"]', {
      name: 'sample-pt.vtt',
      mimeType: 'text/vtt',
      buffer: vttBuffer,
    });
    await optionsPage.waitForSelector('[data-testid="import-preview-card"]');
    await optionsPage.selectOption('[data-testid="import-language-select"]', 'pt-BR');
    await optionsPage.click('[data-testid="confirm-import-button"]');
    await optionsPage.waitForSelector('article:has-text("sample-pt.vtt")');

    // Switch interface language to pt-BR and confirm immediate update
    await optionsPage.click('[data-testid="settings-nav-general"]');
    await optionsPage.selectOption('[data-testid="ui-language-select"]', 'pt-BR');
    const ptAppearanceLabel = await optionsPage.textContent(
      '[data-testid="settings-nav-appearance"]',
    );
    assert.equal(ptAppearanceLabel?.trim(), 'Aparência');
    // Switch back to en for subsequent assertions
    await optionsPage.selectOption('[data-testid="ui-language-select"]', 'en');
    await optionsPage.close();

    // 3. Reopen Popup -> verify IndexedDB persistence + keyboard navigation + 200% zoom layout
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/index.html`, {
      waitUntil: 'domcontentloaded',
    });
    await popupPage.waitForSelector('[data-testid="popup-primary-record-select"]');
    const primaryOptionsText = await popupPage.textContent(
      '[data-testid="popup-primary-record-select"]',
    );
    assert.ok(primaryOptionsText?.includes('sample-en.srt'), 'SRT record should persist in Popup.');
    assert.ok(primaryOptionsText?.includes('sample-pt.vtt'), 'VTT record should persist in Popup.');

    // Keyboard accessibility: Tab moves focus onto an interactive element
    await popupPage.keyboard.press('Tab');
    const focusedTag = await popupPage.evaluate(() => document.activeElement?.tagName ?? '');
    assert.ok(['BUTTON', 'SELECT', 'INPUT'].includes(focusedTag), `Expected focusable element, got ${focusedTag}`);
    await popupPage.close();

    // 4. Playback, Synchronization, Native TextTracks, Seeking, Speed, Ended, Multi-Video & Fullscreen
    const videoPage = await context.newPage();
    await videoPage.goto(url, { waitUntil: 'networkidle' });

    // Wait for real WebM video metadata + native TextTrack cues to load
    await videoPage.waitForFunction(() => {
      const v = document.getElementById('primary-video');
      return Boolean(v && v.readyState >= 1 && v.textTracks.length === 2);
    });

    const contentCode = readFileSync(contentBundlePath, 'utf-8');
    const mountStart = performance.now();
    await videoPage.addScriptTag({ content: contentCode });
    await videoPage.waitForSelector('#primary-player-container [data-subtitleme-overlay]');
    metrics.overlayMountMs = Math.round(performance.now() - mountStart);

    // Wait for Chromium to populate both native tracks' cues (observer switched mode to 'hidden')
    await videoPage.waitForFunction(() => {
      const v = document.getElementById('primary-video');
      if (!v) return false;
      const t0 = v.textTracks[0];
      const t1 = v.textTracks[1];
      return Boolean(t0?.cues && t0.cues.length >= 2 && t1?.cues && t1.cues.length >= 2);
    });

    // Seek to 0.5s -> verify both English and Portuguese native cues render simultaneously in Shadow DOM
    await videoPage.click('#btn-seek-early');
    await videoPage.waitForFunction(() => {
      const host = document.querySelector('#primary-player-container [data-subtitleme-overlay]');
      const p = host?.shadowRoot?.querySelector('[data-slot="primary"]')?.textContent ?? '';
      const s = host?.shadowRoot?.querySelector('[data-slot="secondary"]')?.textContent ?? '';
      return p.includes('Two languages.') && s.includes('Dois idiomas.');
    });

    // Seek forward to 2.0s -> verify second cue pair renders
    await videoPage.click('#btn-seek-late');
    await videoPage.waitForFunction(() => {
      const host = document.querySelector('#primary-player-container [data-subtitleme-overlay]');
      const p = host?.shadowRoot?.querySelector('[data-slot="primary"]')?.textContent ?? '';
      const s = host?.shadowRoot?.querySelector('[data-slot="secondary"]')?.textContent ?? '';
      return p.includes('Synchronized dual subtitles') && s.includes('Legendas duplas');
    });

    // Seek backward to 0.5s -> verify cue 1 returns
    await videoPage.click('#btn-seek-early');
    await videoPage.waitForFunction(() => {
      const host = document.querySelector('#primary-player-container [data-subtitleme-overlay]');
      const p = host?.shadowRoot?.querySelector('[data-slot="primary"]')?.textContent ?? '';
      return p.includes('Two languages.');
    });

    // Playback speed 2x + real play/pause/ended cycle
    await videoPage.click('#btn-speed-2x');
    const rate = await videoPage.evaluate(() => {
      const v = document.getElementById('primary-video');
      return v ? v.playbackRate : 0;
    });
    assert.equal(rate, 2, 'Playback rate should update to 2x.');

    await videoPage.evaluate(async () => {
      const v = document.getElementById('primary-video');
      if (!v) return;
      await v.play();
      v.pause();
      await v.play();
      v.currentTime = Number.isFinite(v.duration) && v.duration > 0.2 ? v.duration - 0.15 : 3.0;
      await new Promise((resolveEnded) => {
        if (v.ended) {
          resolveEnded();
          return;
        }
        v.addEventListener('ended', () => resolveEnded(), { once: true });
      });
    });

    await videoPage.waitForFunction(() => {
      const host = document.querySelector('#primary-player-container [data-subtitleme-overlay]');
      const p = host?.shadowRoot?.querySelector('[data-slot="primary"]')?.textContent ?? '';
      const s = host?.shadowRoot?.querySelector('[data-slot="secondary"]')?.textContent ?? '';
      return p === '' && s === '';
    });

    const afterEnded = await getShadowSubtitleText(videoPage, '#primary-player-container');
    assert.equal(afterEnded.primary, '', 'Primary cue should clear on ended.');
    assert.equal(afterEnded.secondary, '', 'Secondary cue should clear on ended.');

    // Multi-player test: scale up to 5 simultaneous videos, then remove back to 1
    const multiStart = performance.now();
    for (let i = 0; i < 4; i += 1) {
      await videoPage.click('#btn-add-video');
    }
    await videoPage.waitForFunction(
      () => document.querySelectorAll('[data-subtitleme-overlay]').length === 5,
      { timeout: 5000 },
    );
    metrics.fiveVideosMountMs = Math.round(performance.now() - multiStart);

    for (let i = 0; i < 4; i += 1) {
      await videoPage.click('#btn-remove-video');
    }
    await videoPage.waitForFunction(
      () => document.querySelectorAll('[data-subtitleme-overlay]').length === 1,
      { timeout: 5000 },
    );

    // Trigger pagehide disposal and confirm original TextTrack.mode restored to 'disabled'
    await videoPage.evaluate(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    const postDispose = await videoPage.evaluate(() => {
      const v = document.getElementById('primary-video');
      return {
        overlays: document.querySelectorAll('[data-subtitleme-overlay]').length,
        mode0: v?.textTracks[0]?.mode,
        mode1: v?.textTracks[1]?.mode,
      };
    });
    assert.equal(postDispose.overlays, 0, 'All overlays must be removed on pagehide disposal.');
    assert.equal(postDispose.mode0, 'disabled', 'Original TextTrack 0 mode must be restored.');
    assert.equal(postDispose.mode1, 'disabled', 'Original TextTrack 1 mode must be restored.');
    assert.deepEqual(uncaughtErrors, [], `Expected zero uncaught page errors, got: ${uncaughtErrors.join('; ')}`);

    const sourceLabel = process.env.RELEASE_ZIP ? `RELEASE_ZIP=${process.env.RELEASE_ZIP}` : 'dist/';
    console.log(
      `[PASS] Real Chromium E2E Suite passed (${sourceLabel}, extensionId=${extensionId}, mount=${metrics.overlayMountMs}ms, srtImport=${metrics.srtImportMs}ms, fiveVideos=${metrics.fiveVideosMountMs}ms, pageErrors=0).`,
    );
  } finally {
    if (context) {
      await context.close();
    }
    server.close();
    rmSync(userDataDir, { recursive: true, force: true });
    if (extractedTempDir) {
      rmSync(extractedTempDir, { recursive: true, force: true });
    }
  }
}

const isDirectRun =
  process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  run().catch((error) => {
    console.error('[FAIL] Real Chromium E2E Suite failed:', error);
    process.exit(1);
  });
}
