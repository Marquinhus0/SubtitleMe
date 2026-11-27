import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path, { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const defaultAddonDir = resolve(repoRoot, 'apps/stremio-addon');
const defaultReleaseDir = resolve(repoRoot, 'dist/release');

const FORBIDDEN_TOP_LEVEL_PATTERNS = [/\.env/i, /\.map$/i, /\.git/i];

/**
 * Resolves npm invocation without `shell: true` (eliminating Node.js DEP0190 on Windows
 * and avoiding shell argument concatenation).
 *
 * On Windows, executes `npm-cli.js` directly via `process.execPath` (`node.exe`).
 * On POSIX, prefers `npm-cli.js` if explicitly provided via `npm_execpath`, otherwise `npm` directly.
 */
export function resolveNpmInvocation(options = {}) {
  const platform = options.platform ?? process.platform;
  const execPath = options.execPath ?? process.execPath;
  const env = options.env ?? process.env;
  const exists = options.exists ?? existsSync;
  const pathImpl = platform === 'win32' ? path.win32 : path.posix;

  const envNpmExecPath = env.npm_execpath?.trim();
  if (envNpmExecPath && /npm-cli\.js$/i.test(envNpmExecPath) && exists(envNpmExecPath)) {
    return { command: execPath, argsPrefix: [envNpmExecPath], mode: 'node-npm-cli' };
  }

  const execDir = pathImpl.dirname(execPath);
  const npmCliCandidates =
    platform === 'win32'
      ? [
          pathImpl.resolve(execDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
          pathImpl.resolve(execDir, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        ]
      : [
          pathImpl.resolve(execDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
          pathImpl.resolve(execDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        ];

  for (const candidate of npmCliCandidates) {
    if (exists(candidate)) {
      return { command: execPath, argsPrefix: [candidate], mode: 'node-npm-cli' };
    }
  }

  if (platform !== 'win32') {
    return { command: 'npm', argsPrefix: [], mode: 'direct-npm' };
  }

  throw new Error(
    `Could not locate npm-cli.js alongside Node.js (${execPath}). ` +
      'Ensure npm is installed with Node.js so dependencies can be installed safely without shell: true.',
  );
}

/**
 * Executes an external process directly with separate arguments and `shell: false`,
 * preserving exit codes, error propagation, and paths containing spaces.
 */
export function runExternalCommand(command, args, options = {}) {
  const runner = options.execFile ?? execFileSync;
  const execOptions = {
    cwd: options.cwd,
    stdio: options.stdio ?? 'inherit',
    env: options.env,
    shell: false,
  };
  return runner(command, args, execOptions);
}

function walkFiles(dir, baseDir = dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, baseDir));
    } else if (entry.isFile()) {
      results.push(relative(baseDir, full).replace(/\\/g, '/'));
    }
  }
  return results.sort();
}

export function packageStremioAddon(options = {}) {
  const addonDir = options.addonDir ?? defaultAddonDir;
  const releaseDir =
    options.outputDir ??
    (process.env.SUBTITLEME_RELEASE_DIR ? resolve(process.env.SUBTITLEME_RELEASE_DIR) : defaultReleaseDir);
  const execFile = options.execFile ?? execFileSync;
  const stdio = options.stdio ?? 'inherit';

  const addonPkg = JSON.parse(readFileSync(resolve(addonDir, 'package.json'), 'utf-8'));
  const distEntry = resolve(addonDir, 'dist/index.mjs');
  const manifestSrc = readFileSync(resolve(addonDir, 'src/addon/manifest.ts'), 'utf-8');

  assert.ok(
    existsSync(distEntry),
    'Built bundle apps/stremio-addon/dist/index.mjs not found. Run `pnpm --filter @subtitleme/stremio-addon build` first.',
  );

  const version = addonPkg.version;
  assert.ok(version && typeof version === 'string', 'Invalid @subtitleme/stremio-addon version.');
  assert.ok(
    manifestSrc.includes(`version: '${version}'`),
    `manifest.ts version does not match apps/stremio-addon/package.json (${version}).`,
  );

  const sdkRange = addonPkg.dependencies?.['stremio-addon-sdk'];
  assert.ok(sdkRange, 'stremio-addon-sdk dependency missing in apps/stremio-addon/package.json.');

  const stagingDir = mkdtempSync(resolve(tmpdir(), 'subtitleme-stremio-rc-stage-'));
  try {
    mkdirSync(resolve(stagingDir, 'dist'), { recursive: true });
    mkdirSync(resolve(stagingDir, 'bin'), { recursive: true });

    // 1. Write standalone package.json with ZERO workspace:* references
    const standalonePkg = {
      name: addonPkg.name,
      version,
      private: true,
      type: 'module',
      description: 'SubtitleMe Local Companion & Stremio Addon (standalone distribution)',
      engines: {
        node: '>=22.0.0',
      },
      scripts: {
        start: 'node dist/index.mjs',
      },
      dependencies: {
        'stremio-addon-sdk': sdkRange,
      },
      overrides: {
        router: {
          'path-to-regexp': '0.1.13',
        },
        'external-editor': {
          tmp: '0.2.7',
        },
      },
    };
    const standalonePkgJson = `${JSON.stringify(standalonePkg, null, 2)}\n`;
    assert.ok(
      !standalonePkgJson.includes('workspace:'),
      'Standalone package.json must not contain workspace:* references.',
    );
    writeFileSync(resolve(stagingDir, 'package.json'), standalonePkgJson, 'utf-8');

    // 2. Copy built bundle, standalone quickstart documentation, and cross-platform launchers
    cpSync(distEntry, resolve(stagingDir, 'dist/index.mjs'));
    const quickstartSrc = resolve(addonDir, 'QUICKSTART.md');
    assert.ok(existsSync(quickstartSrc), `Missing standalone documentation: ${quickstartSrc}`);
    cpSync(quickstartSrc, resolve(stagingDir, 'QUICKSTART.md'));
    for (const launcher of ['start-companion.sh', 'start-companion.ps1', 'start-companion.cmd']) {
      const src = resolve(addonDir, 'bin', launcher);
      assert.ok(existsSync(src), `Missing launcher: ${src}`);
      cpSync(src, resolve(stagingDir, 'bin', launcher));
    }

    // 3. Install production-only runtime dependencies (stremio-addon-sdk + transitive deps)
    // Invokes npm directly (via node + npm-cli.js on Windows) with shell: false to prevent DEP0190.
    const npmInvocation = resolveNpmInvocation();
    runExternalCommand(
      npmInvocation.command,
      [...npmInvocation.argsPrefix, 'install', '--omit=dev', '--no-audit', '--no-fund', '--ignore-scripts'],
      {
        cwd: stagingDir,
        stdio,
        execFile,
      },
    );

    // Verify stremio-addon-sdk is present in standalone node_modules
    assert.ok(
      existsSync(resolve(stagingDir, 'node_modules/stremio-addon-sdk/package.json')),
      'stremio-addon-sdk was not installed into standalone staging node_modules.',
    );

    // 4. Verify no forbidden artifacts at top-level or dist/bin
    const stagedFiles = walkFiles(stagingDir);
    for (const relPath of stagedFiles) {
      if (!relPath.startsWith('node_modules/')) {
        for (const pattern of FORBIDDEN_TOP_LEVEL_PATTERNS) {
          assert.ok(!pattern.test(relPath), `Forbidden file in release staging: ${relPath}`);
        }
      }
    }

    // 5. Pack reproducible .tar.gz without touching previous RC archives
    mkdirSync(releaseDir, { recursive: true });
    const artifactName = `subtitleme-stremio-v${version}.tar.gz`;
    const archivePath = resolve(releaseDir, artifactName);
    if (existsSync(archivePath)) {
      rmSync(archivePath);
    }

    runExternalCommand('tar', ['-czf', archivePath, '-C', stagingDir, '.'], {
      stdio,
      execFile,
    });

    const buf = readFileSync(archivePath);
    const sha256 = createHash('sha256').update(buf).digest('hex');
    const sizeBytes = statSync(archivePath).size;

    const checksumPath = resolve(releaseDir, `subtitleme-stremio-v${version}.sha256`);
    const releaseLabel = version.includes('-rc.')
      ? 'SubtitleMe Stremio Addon Release Candidate Integrity'
      : 'SubtitleMe Stremio Addon GA Release Integrity';
    writeFileSync(
      checksumPath,
      [
        `${sha256}  ${artifactName}`,
        '',
        `# ${releaseLabel}`,
        `# Artifact: ${artifactName}`,
        `# Version: ${version}`,
        `# Size: ${sizeBytes} bytes`,
        `# Files: ${stagedFiles.length}`,
        `# Generated: ${new Date().toISOString()}`,
        '',
      ].join('\n'),
      'utf-8',
    );

    console.log(`[PASS] Packaged ${artifactName} (${sizeBytes} bytes, ${stagedFiles.length} files)`);
    console.log(`[PASS] SHA-256: ${sha256}`);
    console.log(`[PASS] Checksum written to ${checksumPath}`);

    return {
      artifactName,
      archivePath,
      checksumPath,
      sha256,
      sizeBytes,
      fileCount: stagedFiles.length,
      version,
    };
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

const isDirectRun =
  process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  packageStremioAddon();
}
