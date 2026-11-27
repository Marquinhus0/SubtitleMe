import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDeterministicZipBuffer, FORBIDDEN_RELEASE_PATTERNS } from './zip-utils.mjs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const defaultExtensionDistDir = resolve(repoRoot, 'apps/chrome-extension/dist');
const defaultReleaseDir = resolve(repoRoot, 'dist/release');

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
  return results.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Packages the built Chrome Extension into a bit-for-bit deterministic ZIP archive
 * without relying on external OS binaries (`zip`, `unzip`, PowerShell).
 */
export function packageChromeRelease(options = {}) {
  const extensionDistDir = resolve(options.sourceDir ?? defaultExtensionDistDir);
  const releaseDir = resolve(
    options.outputDir ??
      (process.env.SUBTITLEME_CHROME_RELEASE_DIR
        ? resolve(process.env.SUBTITLEME_CHROME_RELEASE_DIR)
        : defaultReleaseDir),
  );
  const rootPkgPath = resolve(options.rootPkgPath ?? resolve(repoRoot, 'package.json'));
  const extPkgPath = resolve(
    options.extPkgPath ?? resolve(repoRoot, 'apps/chrome-extension/package.json'),
  );

  assert.ok(
    existsSync(extensionDistDir) && statSync(extensionDistDir).isDirectory(),
    `Extension source directory not found: ${extensionDistDir}. Run \`pnpm build\` before \`pnpm package:release\`.`,
  );

  const manifestPath = resolve(extensionDistDir, 'manifest.json');
  assert.ok(
    existsSync(manifestPath),
    `Extension manifest.json not found in ${extensionDistDir}. Run \`pnpm build\` before \`pnpm package:release\`.`,
  );

  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
  const extPkg = JSON.parse(readFileSync(extPkgPath, 'utf-8'));
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
  const requiredPaths = new Set(
    [
      manifest.action?.default_popup,
      manifest.options_page,
      manifest.background?.service_worker,
      'content/index.js',
      ...Object.values(manifest.icons ?? {}),
      ...Object.values(manifest.action?.default_icon ?? {}),
    ].filter(Boolean),
  );

  for (const relPath of requiredPaths) {
    assert.ok(
      existsSync(resolve(extensionDistDir, relPath)),
      `Manifest/runtime referenced file is missing in dist/: ${relPath}`,
    );
  }

  // 3. Collect files deterministically and reject forbidden non-runtime artifacts
  const stagedFiles = walkFiles(extensionDistDir);
  assert.ok(stagedFiles.length > 0, `No files found in ${extensionDistDir}.`);

  const zipEntries = [];
  for (const relPath of stagedFiles) {
    for (const pattern of FORBIDDEN_RELEASE_PATTERNS) {
      assert.ok(
        !pattern.test(relPath),
        `Forbidden non-runtime file found in release package: ${relPath}`,
      );
    }
    zipEntries.push({
      name: relPath,
      data: readFileSync(resolve(extensionDistDir, relPath)),
    });
  }

  // 4. Generate bit-for-bit deterministic ZIP artifact (pure Node.js node:zlib)
  mkdirSync(releaseDir, { recursive: true });
  const artifactName = `subtitleme-chrome-v${manifest.version}.zip`;
  const zipPath = resolve(releaseDir, artifactName);
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }

  const zipBuffer = createDeterministicZipBuffer(zipEntries);
  writeFileSync(zipPath, zipBuffer);

  const sha256 = createHash('sha256').update(zipBuffer).digest('hex');
  const sizeBytes = statSync(zipPath).size;

  const checksumReport = [
    `${sha256}  ${artifactName}`,
    '',
    `# SubtitleMe Chrome Extension Release Candidate Integrity Report`,
    `# Artifact: ${artifactName}`,
    `# Version: ${manifest.version}`,
    `# Size: ${sizeBytes} bytes`,
    `# Files: ${stagedFiles.length}`,
    `# Packaging: Deterministic Pure-Node ZIP (Node.js ${process.version}, ${process.platform})`,
    `# Generated: ${new Date().toISOString()}`,
    '',
  ].join('\n');

  const checksumPath = resolve(releaseDir, 'SHA256SUMS.txt');
  writeFileSync(checksumPath, checksumReport, 'utf-8');

  if (!options.silent) {
    console.log(`[PASS] Packaged ${artifactName} (${sizeBytes} bytes, ${stagedFiles.length} files)`);
    console.log(`[PASS] SHA-256: ${sha256}`);
    console.log(`[PASS] Files:\n  - ${stagedFiles.join('\n  - ')}`);
  }

  return {
    artifactName,
    zipPath,
    checksumPath,
    sha256,
    sizeBytes,
    files: stagedFiles,
    version: manifest.version,
  };
}

const isDirectRun =
  process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  packageChromeRelease();
}
