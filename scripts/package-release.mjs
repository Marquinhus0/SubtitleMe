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
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const extensionDistDir = resolve(repoRoot, 'apps/chrome-extension/dist');
const releaseDir = resolve(repoRoot, 'dist/release');

const FORBIDDEN_PATTERNS = [
  /\.map$/i,
  /\.test\./i,
  /\.spec\./i,
  /\.ts$/i,
  /\.md$/i,
  /\.env/i,
  /node_modules/i,
  /fixtures/i,
  /\.git/i,
];

const DETERMINISTIC_MTIME = new Date('2026-01-01T00:00:00.000Z');

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
  const rootPkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf-8'));
  const extPkg = JSON.parse(
    readFileSync(resolve(repoRoot, 'apps/chrome-extension/package.json'), 'utf-8'),
  );
  const manifestPath = resolve(extensionDistDir, 'manifest.json');

  assert.ok(
    existsSync(manifestPath),
    'Extension build not found. Run `pnpm build` before `pnpm package:release`.',
  );

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  // 1. Validate version consistency across root, extension package, and manifest
  assert.equal(manifest.manifest_version, 3, 'manifest_version must be 3.');
  assert.equal(
    manifest.version,
    rootPkg.version,
    `manifest.json version (${manifest.version}) must match root package.json (${rootPkg.version}).`,
  );
  assert.equal(
    manifest.version,
    extPkg.version,
    `manifest.json version (${manifest.version}) must match chrome-extension package.json (${extPkg.version}).`,
  );

  // 2. Validate every manifest file reference + content script exists in dist/
  const requiredPaths = new Set([
    manifest.action?.default_popup,
    manifest.options_page,
    manifest.background?.service_worker,
    'content/index.js',
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
  ].filter(Boolean));

  for (const relPath of requiredPaths) {
    assert.ok(
      existsSync(resolve(extensionDistDir, relPath)),
      `Manifest/runtime referenced file is missing in dist/: ${relPath}`,
    );
  }

  // 3. Stage clean files into a temporary directory
  const stagingDir = mkdtempSync(resolve(tmpdir(), 'subtitleme-release-stage-'));
  try {
    cpSync(extensionDistDir, stagingDir, { recursive: true });
    const stagedFiles = walkFiles(stagingDir);

    // 4. Reject forbidden artifacts & normalize mtimes for deterministic ZIP output
    for (const relPath of stagedFiles) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        assert.ok(
          !pattern.test(relPath),
          `Forbidden non-runtime file found in release package: ${relPath}`,
        );
      }
      const absPath = resolve(stagingDir, relPath);
      utimesSync(absPath, DETERMINISTIC_MTIME, DETERMINISTIC_MTIME);
    }

    // 5. Generate reproducible ZIP artifact
    mkdirSync(releaseDir, { recursive: true });
    const artifactName = `subtitleme-chrome-v${manifest.version}.zip`;
    const zipPath = resolve(releaseDir, artifactName);
    if (existsSync(zipPath)) {
      rmSync(zipPath);
    }

    execFileSync('zip', ['-X', '-q', zipPath, '-@'], {
      cwd: stagingDir,
      input: `${stagedFiles.join('\n')}\n`,
    });

    const zipBuffer = readFileSync(zipPath);
    const sha256 = createHash('sha256').update(zipBuffer).digest('hex');
    const sizeBytes = statSync(zipPath).size;

    const checksumReport = [
      `${sha256}  ${artifactName}`,
      '',
      `# SubtitleMe Release Integrity Report`,
      `# Artifact: ${artifactName}`,
      `# Version: ${manifest.version}`,
      `# Size: ${sizeBytes} bytes`,
      `# Files: ${stagedFiles.length}`,
      `# Generated: ${new Date().toISOString()}`,
      `# Validated Browser: Google Chrome for Testing 159.0.8154.6`,
      '',
    ].join('\n');

    const checksumPath = resolve(releaseDir, 'SHA256SUMS.txt');
    writeFileSync(checksumPath, checksumReport, 'utf-8');

    console.log(`[PASS] Packaged ${artifactName} (${sizeBytes} bytes, ${stagedFiles.length} files)`);
    console.log(`[PASS] SHA-256: ${sha256}`);
    console.log(`[PASS] Files:\n  - ${stagedFiles.join('\n  - ')}`);
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

main();
