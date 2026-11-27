import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

const LOCAL_FILE_HEADER_SIG = 0x04034b50;
const CENTRAL_DIR_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const ZIP64_EOCD_LOCATOR_SIG = 0x07064b50;

// Fixed deterministic DOS timestamp: 2026-01-01 00:00:00 UTC
const DETERMINISTIC_DOS_TIME = 0x0000;
const DETERMINISTIC_DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 0x5c21
const UTF8_FLAG = 0x0800;
const ENCRYPTED_FLAG = 0x0001;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const STRONG_ENCRYPTION_FLAG = 0x0040;
const VERSION_MADE_BY_UNIX = 0x0314; // UNIX (3) + ZIP 2.0 (20)
const VERSION_NEEDED = 20;
const REGULAR_FILE_UNIX_ATTRS = (0o100644 << 16) >>> 0;
const UNIX_SYMLINK_MODE = 0o120000;
const UNIX_FILE_TYPE_MASK = 0o170000;

export const DEFAULT_ZIP_LIMITS = Object.freeze({
  maxEntries: 512,
  maxEntryBytes: 10 * 1024 * 1024, // 10 MB per file
  maxTotalBytes: 50 * 1024 * 1024, // 50 MB total uncompressed
  maxCompressionRatio: 100, // 100:1 max ratio for files > 4 KB
  compressionRatioMinBytes: 4096,
});

export const FORBIDDEN_RELEASE_PATTERNS = [
  /\.map$/i,
  /\.test\./i,
  /\.spec\./i,
  /\.ts$/i,
  /\.md$/i,
  /\.env/i,
  /node_modules/i,
  /fixtures/i,
  /\.git/i,
  /\.tmp\./i,
  /(?:^|\/)\.DS_Store$/i,
  /(?:^|\/)Thumbs\.db$/i,
];

/**
 * Validates and normalizes a ZIP entry path.
 * Strictly blocks path traversal (`..`), absolute paths, Windows drive letters,
 * UNC paths, backslashes, NUL bytes, and empty segments.
 */
export function validateZipEntryName(rawName) {
  if (typeof rawName !== 'string' || rawName.length === 0) {
    throw new Error('Invalid ZIP entry: empty entry name.');
  }
  if (rawName.includes('\0')) {
    throw new Error(`Invalid ZIP entry: NUL byte not permitted in "${rawName}".`);
  }
  if (rawName.includes('\\')) {
    throw new Error(`Invalid ZIP entry: backslash not permitted in "${rawName}".`);
  }
  if (rawName.startsWith('/') || /^[a-zA-Z]:/.test(rawName)) {
    throw new Error(`Security violation: absolute path not permitted in ZIP entry "${rawName}".`);
  }

  const trimmed = rawName.endsWith('/') ? rawName.slice(0, -1) : rawName;
  if (trimmed.length === 0) {
    throw new Error('Invalid ZIP entry: root directory entry is not permitted.');
  }

  const segments = trimmed.split('/');
  for (const seg of segments) {
    if (seg.length === 0 || seg === '.' || seg === '..') {
      throw new Error(`Security violation: path traversal or invalid segment in ZIP entry "${rawName}".`);
    }
  }
  return trimmed;
}

function compareCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizeCollisionKey(safeName) {
  return safeName.normalize('NFC').toLowerCase();
}

/**
 * Validates the complete set of normalized file paths against:
 * - exact duplicates, case-insensitive duplicates (Windows NTFS), Unicode NFC duplicates
 * - file vs directory prefix collisions (e.g. `a` and `a/b`)
 */
function assertNoPathCollisions(safeNames) {
  const seenKeys = new Set();
  const dirPrefixes = new Set();

  for (const name of safeNames) {
    const key = normalizeCollisionKey(name);
    if (seenKeys.has(key)) {
      throw new Error(`Security violation: duplicate or colliding ZIP entry path "${name}".`);
    }
    seenKeys.add(key);

    const parts = key.split('/');
    for (let i = 1; i < parts.length; i += 1) {
      dirPrefixes.add(parts.slice(0, i).join('/'));
    }
  }

  for (const name of safeNames) {
    const key = normalizeCollisionKey(name);
    if (dirPrefixes.has(key)) {
      throw new Error(`Security violation: file/directory path collision in ZIP entry "${name}".`);
    }
  }
}

/**
 * Creates a bit-for-bit deterministic ZIP archive buffer using only Node.js built-in `node:zlib`.
 * - Entries sorted deterministically by UTF-8 POSIX path.
 * - Fixed DOS timestamp (2026-01-01 00:00:00), fixed UNIX permissions (0644), UTF-8 flag, zero extra fields.
 * - Uses deflate level 9 when smaller than raw, otherwise Store (method 0).
 */
export function createDeterministicZipBuffer(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Cannot create an empty ZIP archive: at least one file entry is required.');
  }

  const normalized = entries.map((entry) => {
    const name = validateZipEntryName(entry.name);
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    return { name, data };
  });

  normalized.sort((a, b) => compareCodePoint(a.name, b.name));
  assertNoPathCollisions(normalized.map((item) => item.name));

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const item of normalized) {
    const nameBuf = Buffer.from(item.name, 'utf-8');
    const uncompressedSize = item.data.length;
    const checksum = crc32(item.data) >>> 0;

    let method = 0;
    let payload = item.data;
    if (uncompressedSize > 0) {
      const deflated = deflateRawSync(item.data, { level: 9 });
      if (deflated.length < uncompressedSize) {
        method = 8;
        payload = deflated;
      }
    }
    const compressedSize = payload.length;

    // Local File Header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(LOCAL_FILE_HEADER_SIG, 0);
    localHeader.writeUInt16LE(VERSION_NEEDED, 4);
    localHeader.writeUInt16LE(UTF8_FLAG, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(DETERMINISTIC_DOS_TIME, 10);
    localHeader.writeUInt16LE(DETERMINISTIC_DOS_DATE, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length

    localParts.push(localHeader, nameBuf, payload);

    // Central Directory File Header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(CENTRAL_DIR_HEADER_SIG, 0);
    centralHeader.writeUInt16LE(VERSION_MADE_BY_UNIX, 4);
    centralHeader.writeUInt16LE(VERSION_NEEDED, 6);
    centralHeader.writeUInt16LE(UTF8_FLAG, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(DETERMINISTIC_DOS_TIME, 12);
    centralHeader.writeUInt16LE(DETERMINISTIC_DOS_DATE, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(REGULAR_FILE_UNIX_ATTRS, 38);
    centralHeader.writeUInt32LE(localOffset, 42);

    centralParts.push(centralHeader, nameBuf);
    localOffset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(normalized.length, 8);
  eocd.writeUInt16LE(normalized.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

function findEocdOffset(buf) {
  const minOffset = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minOffset; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      return i;
    }
  }
  return -1;
}

function hasZip64ExtraField(extraBuf) {
  let pos = 0;
  while (pos + 4 <= extraBuf.length) {
    const headerId = extraBuf.readUInt16LE(pos);
    const dataSize = extraBuf.readUInt16LE(pos + 2);
    if (headerId === 0x0001) return true;
    pos += 4 + dataSize;
  }
  return false;
}

/**
 * Parses, validates, and decompresses all file entries from a ZIP buffer with strict security hardening:
 * - Enforces resource limits (`maxEntries`, `maxEntryBytes`, `maxTotalBytes`, `maxCompressionRatio`, `maxOutputLength`).
 * - Rejects encrypted ZIPs, data descriptors, multi-disk ZIPs, ZIP64, symlinks, and unknown compression methods.
 * - Cross-validates Local File Header against Central Directory and rejects overlapping byte ranges.
 * - Rejects exact, case-insensitive, Unicode NFC duplicates, and file/directory collisions.
 * - Verifies CRC-32 and uncompressed byte length on every entry.
 */
export function readZipEntries(zipBuffer, options = {}) {
  const limits = { ...DEFAULT_ZIP_LIMITS, ...options };

  if (!Buffer.isBuffer(zipBuffer) || zipBuffer.length < 22) {
    throw new Error('Invalid ZIP archive: file is empty or truncated.');
  }

  const eocdOffset = findEocdOffset(zipBuffer);
  if (eocdOffset < 0) {
    throw new Error('Invalid ZIP archive: End of Central Directory record not found.');
  }

  // ZSR-03: Detect ZIP64 EOCD Locator immediately preceding EOCD
  if (eocdOffset >= 20 && zipBuffer.readUInt32LE(eocdOffset - 20) === ZIP64_EOCD_LOCATOR_SIG) {
    throw new Error('Unsupported ZIP format: ZIP64 archives are not supported.');
  }

  const diskNumber = zipBuffer.readUInt16LE(eocdOffset + 4);
  const centralDirDisk = zipBuffer.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = zipBuffer.readUInt16LE(eocdOffset + 8);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const centralDirSize = zipBuffer.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  // ZSR-03: Reject ZIP64 sentinel values in EOCD
  if (
    diskNumber === 0xffff ||
    centralDirDisk === 0xffff ||
    entriesOnDisk === 0xffff ||
    totalEntries === 0xffff ||
    centralDirSize === 0xffffffff ||
    centralDirOffset === 0xffffffff
  ) {
    throw new Error('Unsupported ZIP format: ZIP64 archives are not supported.');
  }

  // ZSR-03: Reject multi-disk ZIP archives
  if (diskNumber !== 0 || centralDirDisk !== 0 || entriesOnDisk !== totalEntries) {
    throw new Error('Unsupported ZIP format: multi-disk ZIP archives are not supported.');
  }

  if (totalEntries === 0) {
    throw new Error('Invalid ZIP archive: archive contains zero entries.');
  }

  // ZSR-01: Enforce entry count limit before parsing
  if (totalEntries > limits.maxEntries) {
    throw new Error(
      `ZIP resource limit exceeded: archive declares ${totalEntries} entries (max ${limits.maxEntries}).`,
    );
  }

  const centralDirEnd = centralDirOffset + centralDirSize;
  if (
    !Number.isSafeInteger(centralDirEnd) ||
    centralDirOffset < 0 ||
    centralDirEnd > eocdOffset
  ) {
    throw new Error('Invalid ZIP archive: Central Directory bounds exceed archive size.');
  }

  const parsedHeaders = [];
  const byteRanges = [];
  let offset = centralDirOffset;
  let declaredTotalBytes = 0;

  // Pass 1: Validate all Central Directory + Local File Headers, ranges, collisions, and declared limits
  for (let i = 0; i < totalEntries; i += 1) {
    if (offset + 46 > centralDirEnd) {
      throw new Error('Invalid ZIP archive: truncated Central Directory entry.');
    }
    if (zipBuffer.readUInt32LE(offset) !== CENTRAL_DIR_HEADER_SIG) {
      throw new Error('Invalid ZIP archive: bad Central Directory header signature.');
    }

    const versionMadeBy = zipBuffer.readUInt16LE(offset + 4);
    const flags = zipBuffer.readUInt16LE(offset + 8);
    const method = zipBuffer.readUInt16LE(offset + 10);
    const expectedCrc = zipBuffer.readUInt32LE(offset + 16);
    const compressedSize = zipBuffer.readUInt32LE(offset + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(offset + 24);
    const nameLen = zipBuffer.readUInt16LE(offset + 28);
    const extraLen = zipBuffer.readUInt16LE(offset + 30);
    const commentLen = zipBuffer.readUInt16LE(offset + 32);
    const diskStart = zipBuffer.readUInt16LE(offset + 34);
    const externalAttrs = zipBuffer.readUInt32LE(offset + 38);
    const localHeaderOffset = zipBuffer.readUInt32LE(offset + 42);

    const nameEnd = offset + 46 + nameLen;
    const extraEnd = nameEnd + extraLen;
    const entryEnd = extraEnd + commentLen;
    if (entryEnd > centralDirEnd) {
      throw new Error('Invalid ZIP archive: entry metadata exceeds Central Directory bounds.');
    }

    const rawName = zipBuffer.subarray(offset + 46, nameEnd).toString('utf-8');
    const centralExtra = zipBuffer.subarray(nameEnd, extraEnd);
    offset = entryEnd;

    // ZSR-03: Reject unsupported ZIP features explicitly
    if (diskStart !== 0) {
      throw new Error(`Unsupported ZIP format: multi-disk entry "${rawName}" is not supported.`);
    }
    if ((flags & ENCRYPTED_FLAG) !== 0 || (flags & STRONG_ENCRYPTION_FLAG) !== 0) {
      throw new Error(`Unsupported ZIP format: encrypted entry "${rawName}" is not supported.`);
    }
    if ((flags & DATA_DESCRIPTOR_FLAG) !== 0) {
      throw new Error(`Unsupported ZIP format: data descriptor on "${rawName}" is not supported.`);
    }
    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff ||
      hasZip64ExtraField(centralExtra)
    ) {
      throw new Error(`Unsupported ZIP format: ZIP64 entry "${rawName}" is not supported.`);
    }
    if (method !== 0 && method !== 8) {
      throw new Error(`Unsupported ZIP compression method (${method}) for "${rawName}".`);
    }

    // Reject UNIX symlinks embedded in ZIP archives
    if ((versionMadeBy >> 8) === 3) {
      const unixMode = (externalAttrs >>> 16) & UNIX_FILE_TYPE_MASK;
      if (unixMode === UNIX_SYMLINK_MODE) {
        throw new Error(`Security violation: symbolic link not permitted in ZIP entry "${rawName}".`);
      }
    }

    // ZSR-02: Validate Local File Header exists inside [0, centralDirOffset)
    if (localHeaderOffset + 30 > centralDirOffset) {
      throw new Error(`Invalid ZIP archive: local header for "${rawName}" exceeds Central Directory boundary.`);
    }
    if (zipBuffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_HEADER_SIG) {
      throw new Error(`Invalid ZIP archive: bad local header signature for "${rawName}".`);
    }

    const localFlags = zipBuffer.readUInt16LE(localHeaderOffset + 6);
    const localMethod = zipBuffer.readUInt16LE(localHeaderOffset + 8);
    const localCrc = zipBuffer.readUInt32LE(localHeaderOffset + 14);
    const localCompressedSize = zipBuffer.readUInt32LE(localHeaderOffset + 18);
    const localUncompressedSize = zipBuffer.readUInt32LE(localHeaderOffset + 22);
    const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);

    const localNameStart = localHeaderOffset + 30;
    const localNameEnd = localNameStart + localNameLen;
    const dataStart = localNameEnd + localExtraLen;
    const dataEnd = dataStart + compressedSize;

    if (!Number.isSafeInteger(dataEnd) || dataEnd > centralDirOffset) {
      throw new Error(`Invalid ZIP archive: data payload for "${rawName}" overlaps Central Directory or exceeds bounds.`);
    }

    const localRawName = zipBuffer.subarray(localNameStart, localNameEnd).toString('utf-8');
    const localExtra = zipBuffer.subarray(localNameEnd, dataStart);
    if (hasZip64ExtraField(localExtra)) {
      throw new Error(`Unsupported ZIP format: ZIP64 local header on "${rawName}" is not supported.`);
    }

    // ZSR-02: Cross-check Local File Header vs Central Directory (prevents parser differentials)
    if (
      localRawName !== rawName ||
      localFlags !== flags ||
      localMethod !== method ||
      localCrc !== expectedCrc ||
      localCompressedSize !== compressedSize ||
      localUncompressedSize !== uncompressedSize
    ) {
      throw new Error(
        `Security violation: Local File Header does not match Central Directory for "${rawName}".`,
      );
    }

    byteRanges.push({ start: localHeaderOffset, end: dataEnd, name: rawName });

    // Skip explicit directory entries after validating headers & name
    if (rawName.endsWith('/')) {
      validateZipEntryName(rawName);
      if (compressedSize !== 0 || uncompressedSize !== 0) {
        throw new Error(`Invalid ZIP archive: directory entry "${rawName}" has non-zero payload.`);
      }
      continue;
    }

    const safeName = validateZipEntryName(rawName);

    // ZSR-01: Enforce per-entry, total, and compression-ratio limits before decompression
    if (uncompressedSize > limits.maxEntryBytes) {
      throw new Error(
        `ZIP resource limit exceeded: "${safeName}" uncompressed size (${uncompressedSize}) exceeds max (${limits.maxEntryBytes}).`,
      );
    }
    declaredTotalBytes += uncompressedSize;
    if (!Number.isSafeInteger(declaredTotalBytes) || declaredTotalBytes > limits.maxTotalBytes) {
      throw new Error(
        `ZIP resource limit exceeded: total uncompressed size exceeds max (${limits.maxTotalBytes} bytes).`,
      );
    }
    if (uncompressedSize > limits.compressionRatioMinBytes) {
      if (compressedSize === 0 || uncompressedSize / compressedSize > limits.maxCompressionRatio) {
        throw new Error(
          `ZIP resource limit exceeded: suspicious compression ratio on "${safeName}" (max ${limits.maxCompressionRatio}:1).`,
        );
      }
    }

    parsedHeaders.push({
      safeName,
      method,
      expectedCrc,
      compressedSize,
      uncompressedSize,
      dataStart,
      dataEnd,
    });
  }

  // ZSR-02: Detect overlapping local headers / compressed payloads
  byteRanges.sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < byteRanges.length; i += 1) {
    const prev = byteRanges[i - 1];
    const curr = byteRanges[i];
    if (curr.start < prev.end) {
      throw new Error(
        `Security violation: overlapping ZIP entries detected ("${prev.name}" and "${curr.name}").`,
      );
    }
  }

  // ZSR-04: Validate complete path set for exact, case-insensitive, Unicode NFC, and file/dir collisions
  assertNoPathCollisions(parsedHeaders.map((h) => h.safeName));

  // Pass 2: Decompress with strict `maxOutputLength` and verify real sizes + CRC-32
  const entries = [];
  let actualTotalBytes = 0;

  for (const h of parsedHeaders) {
    const compressedSlice = zipBuffer.subarray(h.dataStart, h.dataEnd);
    let data;
    if (h.method === 0) {
      data = Buffer.from(compressedSlice);
    } else {
      try {
        data = inflateRawSync(compressedSlice, { maxOutputLength: limits.maxEntryBytes });
      } catch (err) {
        const code = err && typeof err === 'object' ? err.code : undefined;
        if (code === 'ERR_BUFFER_TOO_LARGE') {
          throw new Error(
            `ZIP resource limit exceeded: "${h.safeName}" decompressed output exceeded maxEntryBytes (${limits.maxEntryBytes}).`,
            { cause: err },
          );
        }
        throw err;
      }
    }

    if (data.length > limits.maxEntryBytes) {
      throw new Error(
        `ZIP resource limit exceeded: "${h.safeName}" decompressed size (${data.length}) exceeds max (${limits.maxEntryBytes}).`,
      );
    }
    actualTotalBytes += data.length;
    if (!Number.isSafeInteger(actualTotalBytes) || actualTotalBytes > limits.maxTotalBytes) {
      throw new Error(
        `ZIP resource limit exceeded: actual total uncompressed size exceeds max (${limits.maxTotalBytes} bytes).`,
      );
    }
    if (data.length !== h.uncompressedSize) {
      throw new Error(`Invalid ZIP archive: uncompressed size mismatch for "${h.safeName}".`);
    }
    if (
      data.length > limits.compressionRatioMinBytes &&
      (h.compressedSize === 0 || data.length / h.compressedSize > limits.maxCompressionRatio)
    ) {
      throw new Error(
        `ZIP resource limit exceeded: actual compression ratio on "${h.safeName}" exceeds max (${limits.maxCompressionRatio}:1).`,
      );
    }

    const actualCrc = crc32(data) >>> 0;
    if (actualCrc !== h.expectedCrc) {
      throw new Error(`Invalid ZIP archive: CRC-32 integrity check failed for "${h.safeName}".`);
    }

    entries.push({ name: h.safeName, data });
  }

  return entries;
}

/**
 * Safely extracts a ZIP file or Buffer into `destDir`.
 * Validates ALL entries and decompresses/authenticates them BEFORE writing a single byte (fail-closed):
 * - Enforces ZIP bomb resource limits (`DEFAULT_ZIP_LIMITS` or overrides).
 * - Blocks path traversal, case-insensitive / Unicode / file-dir collisions, symlinks, and forbidden patterns.
 * - Uses exclusive file creation (`wx`) to prevent unintended overwrites.
 */
export function extractZipSafely(zipPathOrBuffer, destDir, options = {}) {
  const zipBuffer = Buffer.isBuffer(zipPathOrBuffer)
    ? zipPathOrBuffer
    : readFileSync(zipPathOrBuffer);
  const forbiddenPatterns = options.forbiddenPatterns ?? [];

  const entries = readZipEntries(zipBuffer, options);
  const resolvedDest = resolve(destDir);
  const destPrefix = `${resolvedDest}${sep}`;

  // Pre-validate all target paths & forbidden patterns before touching disk
  const plannedWrites = entries.map((entry) => {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(entry.name)) {
        throw new Error(`Forbidden file found in ZIP archive: "${entry.name}".`);
      }
    }
    const targetPath = resolve(resolvedDest, entry.name);
    if (!targetPath.startsWith(destPrefix)) {
      throw new Error(`Security violation: ZIP entry escapes target directory: "${entry.name}".`);
    }
    if (existsSync(targetPath)) {
      throw new Error(`Refusing to overwrite existing file during ZIP extraction: "${entry.name}".`);
    }
    return { name: entry.name, targetPath, data: entry.data };
  });

  mkdirSync(resolvedDest, { recursive: true });
  for (const item of plannedWrites) {
    mkdirSync(dirname(item.targetPath), { recursive: true });
    writeFileSync(item.targetPath, item.data, { flag: 'wx' });
  }

  return plannedWrites.map((item) => item.name).sort(compareCodePoint);
}
