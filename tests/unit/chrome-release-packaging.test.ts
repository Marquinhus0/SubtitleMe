import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { packageChromeRelease } from '../../scripts/package-release.mjs';
import {
  createDeterministicZipBuffer,
  DEFAULT_ZIP_LIMITS,
  extractZipSafely,
  FORBIDDEN_RELEASE_PATTERNS,
  readZipEntries,
  validateZipEntryName,
} from '../../scripts/zip-utils.mjs';
import { prepareReleaseZipForE2E } from '../e2e/chrome-extension.mjs';

const tempDirs: string[] = [];

function createTempDir(prefix = 'subtitleme-s22-1-'): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function buildMinimalValidExtensionDir(dir: string): void {
  mkdirSync(join(dir, 'icons'), { recursive: true });
  mkdirSync(join(dir, 'popup'), { recursive: true });
  mkdirSync(join(dir, 'options'), { recursive: true });
  mkdirSync(join(dir, 'background'), { recursive: true });
  mkdirSync(join(dir, 'content'), { recursive: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });

  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      manifest_version: 3,
      name: 'SubtitleMe',
      version: '1.0.0',
      icons: {
        '16': 'icons/icon16.png',
        '32': 'icons/icon32.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
      action: {
        default_popup: 'popup/index.html',
        default_icon: { '16': 'icons/icon16.png' },
      },
      options_page: 'options/index.html',
      background: { service_worker: 'background/service-worker.js' },
    }),
    'utf-8',
  );
  for (const size of ['16', '32', '48', '128']) {
    writeFileSync(join(dir, 'icons', `icon${size}.png`), Buffer.from([0x89, 0x50, 0x4e, 0x47, Number(size)]));
  }
  writeFileSync(join(dir, 'popup', 'index.html'), '<!doctype html><title>Popup</title>', 'utf-8');
  writeFileSync(join(dir, 'options', 'index.html'), '<!doctype html><title>Options</title>', 'utf-8');
  writeFileSync(join(dir, 'background', 'service-worker.js'), 'console.info("sw");', 'utf-8');
  writeFileSync(join(dir, 'content', 'index.js'), '(() => {})();', 'utf-8');
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('Sprint 22.1 (CGA-04) — Deterministic Cross-Platform ZIP & Safe Extraction', () => {
  it('generates bit-for-bit identical deterministic ZIP archives including Unicode filenames', () => {
    const entriesA = [
      { name: 'z-last.txt', data: Buffer.from('last file content repeated '.repeat(20)) },
      { name: 'assets/legenda-português-日本語.txt', data: Buffer.from('Olá 世界', 'utf-8') },
      { name: 'a-first.json', data: Buffer.from('{"ok":true}') },
    ];
    // Reversed input order must yield identical ZIP bytes
    const entriesB = [...entriesA].reverse();

    const zip1 = createDeterministicZipBuffer(entriesA);
    const zip2 = createDeterministicZipBuffer(entriesB);
    expect(zip1.equals(zip2)).toBe(true);

    const parsed = readZipEntries(zip1);
    expect(parsed.map((e) => e.name)).toEqual([
      'a-first.json',
      'assets/legenda-português-日本語.txt',
      'z-last.txt',
    ]);
    expect(parsed[1]?.data.toString('utf-8')).toBe('Olá 世界');
  });

  it('rejects path traversal, absolute Windows/POSIX paths, backslashes, and NUL bytes', () => {
    for (const bad of [
      '',
      '../escape.txt',
      'a/../../escape.txt',
      '/etc/passwd',
      'C:\\Windows\\system.ini',
      'C:/Windows/system.ini',
      'folder\\file.js',
      'bad\0name.js',
    ]) {
      expect(() => validateZipEntryName(bad)).toThrow();
    }
  });

  it('rejects empty, truncated, and CRC-corrupted ZIP buffers', () => {
    expect(() => readZipEntries(Buffer.alloc(0))).toThrow(/empty or truncated/i);
    expect(() => readZipEntries(Buffer.from('not-a-zip-file-at-all-1234567890'))).toThrow(/End of Central Directory/i);

    const validZip = createDeterministicZipBuffer([
      { name: 'hello.txt', data: Buffer.from('Hello SubtitleMe ZIP integrity!') },
    ]);
    // Corrupt one byte inside the payload
    const corrupted = Buffer.from(validZip);
    corrupted[45] = (corrupted[45] ?? 0) ^ 0xff;
    expect(() => readZipEntries(corrupted)).toThrow();
  });

  it('blocks path traversal embedded in raw ZIP bytes and refuses overwriting existing files on extract', () => {
    // Craft a valid ZIP then patch entry name in both local + central headers to "../pwn.txt"
    const zip = createDeterministicZipBuffer([{ name: 'aaaa/b.txt', data: Buffer.from('x') }]);
    const patched = Buffer.from(zip);
    const orig = Buffer.from('aaaa/b.txt', 'utf-8');
    const evil = Buffer.from('../pwn.txt', 'utf-8');
    let idx = patched.indexOf(orig);
    while (idx !== -1) {
      evil.copy(patched, idx);
      idx = patched.indexOf(orig, idx + orig.length);
    }

    const dest = createTempDir();
    expect(() => extractZipSafely(patched, dest)).toThrow(/path traversal/i);

    // Normal safe extraction succeeds, and second extraction into same dir refuses overwrite
    const goodZip = createDeterministicZipBuffer([{ name: 'safe.txt', data: Buffer.from('ok') }]);
    const extracted = extractZipSafely(goodZip, dest);
    expect(extracted).toEqual(['safe.txt']);
    expect(readFileSync(join(dest, 'safe.txt'), 'utf-8')).toBe('ok');
    expect(() => extractZipSafely(goodZip, dest)).toThrow(/Refusing to overwrite/i);
  });

  it('packages Chrome Extension reproducibly into spaced output dir and validates missing manifest/icons/forbidden files', () => {
    const srcDir = createTempDir('subtitleme-src-');
    buildMinimalValidExtensionDir(srcDir);

    const outDir1 = join(createTempDir('subtitleme out 1 '), 'My Releases');
    const outDir2 = join(createTempDir('subtitleme out 2 '), 'My Releases');

    const r1 = packageChromeRelease({ sourceDir: srcDir, outputDir: outDir1, silent: true });
    const r2 = packageChromeRelease({ sourceDir: srcDir, outputDir: outDir2, silent: true });

    expect(r1.sha256).toBe(r2.sha256);
    expect(r1.sizeBytes).toBe(r2.sizeBytes);
    expect(r1.files).toEqual(r2.files);
    expect(existsSync(r1.zipPath)).toBe(true);
    expect(existsSync(r1.checksumPath)).toBe(true);

    // Invalid source dir
    expect(() =>
      packageChromeRelease({ sourceDir: join(srcDir, 'nonexistent'), outputDir: outDir1, silent: true }),
    ).toThrow(/source directory not found/i);

    // Missing icon
    rmSync(join(srcDir, 'icons', 'icon128.png'));
    expect(() => packageChromeRelease({ sourceDir: srcDir, outputDir: outDir1, silent: true })).toThrow(
      /missing in dist\/: icons\/icon128\.png/i,
    );
    writeFileSync(join(srcDir, 'icons', 'icon128.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    // Forbidden .map file rejected
    writeFileSync(join(srcDir, 'assets', 'bundle.js.map'), '{}', 'utf-8');
    expect(() => packageChromeRelease({ sourceDir: srcDir, outputDir: outDir1, silent: true })).toThrow(
      /Forbidden non-runtime file/i,
    );
    rmSync(join(srcDir, 'assets', 'bundle.js.map'));

    // Missing manifest.json
    rmSync(join(srcDir, 'manifest.json'));
    expect(() => packageChromeRelease({ sourceDir: srcDir, outputDir: outDir1, silent: true })).toThrow(
      /manifest\.json not found/i,
    );
  });

  it('validates RELEASE_ZIP via prepareReleaseZipForE2E and rejects ZIPs with forbidden files', () => {
    const srcDir = createTempDir('subtitleme-e2e-src-');
    const outDir = createTempDir('subtitleme-e2e-out-');
    buildMinimalValidExtensionDir(srcDir);

    const packed = packageChromeRelease({ sourceDir: srcDir, outputDir: outDir, silent: true });
    const prepared = prepareReleaseZipForE2E(packed.zipPath);
    try {
      expect(prepared.manifest.manifest_version).toBe(3);
      expect(prepared.extractedFiles).toContain('manifest.json');
      expect(existsSync(join(prepared.extractedTempDir, 'content', 'index.js'))).toBe(true);
    } finally {
      rmSync(prepared.extractedTempDir, { recursive: true, force: true });
    }

    // Forbidden file inside crafted ZIP is rejected by prepareReleaseZipForE2E
    const badZipPath = join(outDir, 'bad-forbidden.zip');
    writeFileSync(
      badZipPath,
      createDeterministicZipBuffer([
        { name: 'manifest.json', data: Buffer.from('{"manifest_version":3}') },
        { name: 'secrets.env', data: Buffer.from('SECRET=1') },
      ]),
    );
    expect(() => prepareReleaseZipForE2E(badZipPath)).toThrow(/Forbidden file/i);
    expect(FORBIDDEN_RELEASE_PATTERNS.some((p) => p.test('foo.js.map'))).toBe(true);
  });
});

/**
 * Helper to craft raw malformed/adversarial ZIP fixtures for ZSR-01..ZSR-05 tests.
 */
function buildRawZipFixture(
  rawEntries: Array<{
    name: string;
    localName?: string;
    data: Buffer;
    method?: number;
    flags?: number;
    localFlags?: number;
    localMethod?: number;
    declaredUncompressedSize?: number;
    declaredCrc?: number;
    localHeaderOffsetOverride?: number;
    diskStart?: number;
  }>,
  eocdOverrides: {
    diskNumber?: number;
    centralDirDisk?: number;
    entriesOnDisk?: number;
    totalEntries?: number;
    zip64Sentinel?: boolean;
  } = {},
): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const item of rawEntries) {
    const nameBuf = Buffer.from(item.name, 'utf-8');
    const localNameBuf = Buffer.from(item.localName ?? item.name, 'utf-8');
    const method = item.method ?? 8;
    const payload = method === 8 ? deflateRawSync(item.data, { level: 9 }) : item.data;
    const flags = item.flags ?? 0x0800;
    const checksum = item.declaredCrc ?? (crc32(item.data) >>> 0);
    const uncompressedSize = item.declaredUncompressedSize ?? item.data.length;
    const compressedSize = payload.length;

    const myOffset = item.localHeaderOffsetOverride ?? localOffset;

    if (item.localHeaderOffsetOverride === undefined) {
      const lh = Buffer.alloc(30);
      lh.writeUInt32LE(0x04034b50, 0);
      lh.writeUInt16LE(20, 4);
      lh.writeUInt16LE(item.localFlags ?? flags, 6);
      lh.writeUInt16LE(item.localMethod ?? method, 8);
      lh.writeUInt32LE(checksum, 14);
      lh.writeUInt32LE(compressedSize, 18);
      lh.writeUInt32LE(uncompressedSize, 22);
      lh.writeUInt16LE(localNameBuf.length, 26);
      lh.writeUInt16LE(0, 28);
      localParts.push(lh, localNameBuf, payload);
      localOffset += lh.length + localNameBuf.length + payload.length;
    }

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(0x0314, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(flags, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt32LE(checksum, 16);
    ch.writeUInt32LE(compressedSize, 20);
    ch.writeUInt32LE(uncompressedSize, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(item.diskStart ?? 0, 34);
    ch.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    ch.writeUInt32LE(myOffset, 42);
    centralParts.push(ch, nameBuf);
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(eocdOverrides.diskNumber ?? 0, 4);
  eocd.writeUInt16LE(eocdOverrides.centralDirDisk ?? 0, 6);
  eocd.writeUInt16LE(eocdOverrides.entriesOnDisk ?? rawEntries.length, 8);
  eocd.writeUInt16LE(
    eocdOverrides.zip64Sentinel ? 0xffff : (eocdOverrides.totalEntries ?? rawEntries.length),
    10,
  );
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

describe('Sprint 22.1 (ZSR-01 to ZSR-05) — Hardened ZIP Bomb, Header, Format & Collision Defenses', () => {
  it('ZSR-01: enforces maxEntries, maxEntryBytes, maxTotalBytes, maxCompressionRatio, and inflateRawSync maxOutputLength', () => {
    expect(DEFAULT_ZIP_LIMITS.maxEntries).toBe(512);
    expect(DEFAULT_ZIP_LIMITS.maxEntryBytes).toBe(10 * 1024 * 1024);
    expect(DEFAULT_ZIP_LIMITS.maxTotalBytes).toBe(50 * 1024 * 1024);
    expect(DEFAULT_ZIP_LIMITS.maxCompressionRatio).toBe(100);

    // 1. Excess entries
    const manyEntries = Array.from({ length: 5 }, (_, i) => ({
      name: `f${i}.txt`,
      data: Buffer.from('ok'),
    }));
    const manyZip = createDeterministicZipBuffer(manyEntries);
    expect(() => readZipEntries(manyZip, { maxEntries: 3 })).toThrow(/declares 5 entries \(max 3\)/i);

    // 2. Entry above individual limit
    const bigEntryZip = createDeterministicZipBuffer([
      { name: 'big.bin', data: Buffer.alloc(2048, 0x41) },
    ]);
    expect(() => readZipEntries(bigEntryZip, { maxEntryBytes: 1024 })).toThrow(/uncompressed size .* exceeds max/i);

    // 3. Excess total uncompressed limit
    const totalZip = createDeterministicZipBuffer([
      { name: 'a.bin', data: Buffer.alloc(600, 0x41) },
      { name: 'b.bin', data: Buffer.alloc(600, 0x42) },
    ]);
    expect(() => readZipEntries(totalZip, { maxEntryBytes: 1000, maxTotalBytes: 1000 })).toThrow(
      /total uncompressed size exceeds max/i,
    );

    // 4. Compression ratio above 100:1 (highly compressible 200 KB of zeroes compresses to ~250 bytes -> >800:1)
    const bombZip = createDeterministicZipBuffer([
      { name: 'bomb.txt', data: Buffer.alloc(200_000, 0x00) },
    ]);
    expect(() => readZipEntries(bombZip)).toThrow(/compression ratio/i);

    // 5. Lying header where actual inflateRawSync output exceeds maxOutputLength
    const lyingZip = buildRawZipFixture([
      {
        name: 'lying.bin',
        data: Buffer.alloc(4096, 0x42),
        method: 8,
        declaredUncompressedSize: 100, // lies to bypass declared check; inflateRawSync maxOutputLength catches it!
      },
    ]);
    expect(() =>
      readZipEntries(lyingZip, { maxEntryBytes: 512, maxCompressionRatio: 10000 }),
    ).toThrow(/exceeded maxEntryBytes/i);
  });

  it('ZSR-02: rejects Local Header vs Central Directory mismatch and overlapping entries', () => {
    // 6. Local header filename mismatch
    const nameMismatch = buildRawZipFixture([
      { name: 'safe.txt', localName: 'evil.txt', data: Buffer.from('abc') },
    ]);
    expect(() => readZipEntries(nameMismatch)).toThrow(/Local File Header does not match Central Directory/i);

    // 7. Central directory vs Local header method mismatch
    const methodMismatch = buildRawZipFixture([
      { name: 'a.txt', data: Buffer.from('hello'), method: 0, localMethod: 8 },
    ]);
    expect(() => readZipEntries(methodMismatch)).toThrow(/Local File Header does not match Central Directory/i);

    // 8. Overlapping entries (two central dir records pointing at same local header offset 0)
    const overlapZip = buildRawZipFixture([
      { name: 'first.txt', data: Buffer.from('same') },
      { name: 'first.txt', data: Buffer.from('same'), localHeaderOffsetOverride: 0 },
    ]);
    expect(() => readZipEntries(overlapZip)).toThrow(/overlapping ZIP entries/i);
  });

  it('ZSR-03: explicitly rejects encrypted ZIP, data descriptor, multi-disk, and ZIP64', () => {
    // 9. Encrypted ZIP (flags & 0x0001)
    const encryptedZip = buildRawZipFixture([
      { name: 'secret.txt', data: Buffer.from('abc'), flags: 0x0801 },
    ]);
    expect(() => readZipEntries(encryptedZip)).toThrow(/encrypted entry/i);

    // 10. Data descriptor (flags & 0x0008)
    const ddZip = buildRawZipFixture([
      { name: 'stream.txt', data: Buffer.from('abc'), flags: 0x0808 },
    ]);
    expect(() => readZipEntries(ddZip)).toThrow(/data descriptor/i);

    // 11. Multi-disk ZIP
    const multiDiskZip = buildRawZipFixture(
      [{ name: 'a.txt', data: Buffer.from('abc') }],
      { diskNumber: 1, centralDirDisk: 0 },
    );
    expect(() => readZipEntries(multiDiskZip)).toThrow(/multi-disk/i);

    // 12. ZIP64 sentinel
    const zip64 = buildRawZipFixture(
      [{ name: 'a.txt', data: Buffer.from('abc') }],
      { zip64Sentinel: true },
    );
    expect(() => readZipEntries(zip64)).toThrow(/ZIP64/i);
  });

  it('ZSR-04: rejects case-insensitive duplicates, Unicode NFC collisions, and file/dir collisions with ZERO partial disk writes', () => {
    const dest = createTempDir('subtitleme-zsr04-');

    // 13. Case-insensitive duplicate (Manifest.json vs manifest.json)
    const caseZip = buildRawZipFixture([
      { name: 'Manifest.json', data: Buffer.from('{"a":1}') },
      { name: 'manifest.json', data: Buffer.from('{"a":2}') },
    ]);
    expect(() => extractZipSafely(caseZip, dest)).toThrow(/duplicate or colliding/i);
    expect(readdirSync(dest)).toEqual([]); // 16. Zero files written on failure!

    // 14. File vs directory collision (a and a/b.txt)
    const fileDirZip = buildRawZipFixture([
      { name: 'good.txt', data: Buffer.from('ok') },
      { name: 'a', data: Buffer.from('file') },
      { name: 'a/b.txt', data: Buffer.from('nested') },
    ]);
    expect(() => extractZipSafely(fileDirZip, dest)).toThrow(/file\/directory path collision/i);
    expect(readdirSync(dest)).toEqual([]); // Zero partial writes even for `good.txt`!

    // 15. Unicode NFD vs NFC collision (cafe\u0301.txt vs caf\u00e9.txt)
    const unicodeCollisionZip = buildRawZipFixture([
      { name: 'cafe\u0301.txt', data: Buffer.from('nfd') },
      { name: 'caf\u00e9.txt', data: Buffer.from('nfc') },
    ]);
    expect(() => extractZipSafely(unicodeCollisionZip, dest)).toThrow(/duplicate or colliding/i);
    expect(readdirSync(dest)).toEqual([]);
  });
});
