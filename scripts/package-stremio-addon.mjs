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
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const addonDir = resolve(repoRoot, 'apps/stremio-addon');
const releaseDir = resolve(repoRoot, 'dist/release');

const FORBIDDEN_TOP_LEVEL_PATTERNS = [/\.env/i, /\.map$/i, /\.git/i];

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

function main() {
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
    const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execFileSync(
      npmBin,
      ['install', '--omit=dev', '--no-audit', '--no-fund', '--ignore-scripts'],
      {
        cwd: stagingDir,
        stdio: 'inherit',
        shell: process.platform === 'win32',
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

    execFileSync('tar', ['-czf', archivePath, '-C', stagingDir, '.'], {
      stdio: 'inherit',
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
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

main();
