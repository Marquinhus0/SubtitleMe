import { randomBytes, randomUUID } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import type { SubtitleFormat } from '@subtitleme/shared-types';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import { findLanguageDescriptor } from '../config/addon-config';
import { MAX_COMPANION_SUBTITLE_BYTES } from './companion-config';
import type { CompanionSubtitleRecord, ContentAssociationKind } from './companion-types';
import { validateContentId, validateSubtitleFilename } from './companion-validation';

export const DEFAULT_MAX_PERSISTENCE_BYTES = 50 * 1024 * 1024; // 50 MB default quota
const INDEX_FILENAME = 'index.json';
const INTERNAL_FILE_RE = /^[a-f0-9-]{36}\.(srt|vtt)$/;
const TEMP_FILE_MARKER = '.tmp.';

export interface PersistedIndexEntry {
  readonly id: string;
  readonly contentId: string;
  readonly associationKind: ContentAssociationKind;
  readonly language: string;
  readonly format: SubtitleFormat;
  /** Sanitized display metadata ONLY — never used as a filesystem path. */
  readonly filename: string;
  /** App-generated random internal filename stored inside `dataDir`. */
  readonly internalFile: string;
  readonly byteLength: number;
  readonly cueCount: number;
  readonly uploadedAt: number;
}

interface PersistedIndexDocument {
  readonly version: 1;
  readonly entries: PersistedIndexEntry[];
}

export interface CompanionPersistenceOptions {
  /** Opt-in flag. Defaults to `false` until explicit user consent. */
  enabled?: boolean;
  /** Controlled private app data directory. Defaults to `~/.subtitleme/stremio-companion`. */
  dataDir?: string;
  /** Maximum total disk bytes permitted across all persisted subtitle files. */
  maxStorageBytes?: number;
}

export interface CompanionStorageStatus {
  readonly enabled: boolean;
  readonly dataDir: string;
  readonly usedBytes: number;
  readonly maxBytes: number;
  readonly trackCount: number;
  readonly recoveredCount: number;
  readonly corruptedSkippedCount: number;
  readonly cleanedTempFiles: number;
  readonly encryptedAtRest: false;
}

export interface PersistenceRecoveryResult {
  readonly records: Array<{ record: CompanionSubtitleRecord; sampleLines: readonly string[] }>;
  readonly corruptedSkippedCount: number;
  readonly cleanedTempFiles: number;
}

function getDefaultDataDir(): string {
  return join(homedir(), '.subtitleme', 'stremio-companion');
}

/**
 * Ensures any resolved path stays strictly inside `baseDir` (prevents path traversal).
 */
export function assertPathInsideDir(baseDir: string, candidatePath: string): string {
  const resolvedBase = resolve(baseDir);
  const resolvedCandidate = resolve(candidatePath);
  if (
    resolvedCandidate !== resolvedBase &&
    !resolvedCandidate.startsWith(`${resolvedBase}${sep}`)
  ) {
    throw new Error('Security violation: attempted path traversal outside Companion data directory.');
  }
  return resolvedCandidate;
}

/**
 * Rejects symbolic links on existing paths to prevent symlink escapes outside `dataDir`.
 */
export function assertNotSymlink(targetPath: string): void {
  if (!existsSync(targetPath)) return;
  const stats = lstatSync(targetPath);
  if (stats.isSymbolicLink()) {
    throw new Error('Security violation: symbolic links are not permitted in Companion data directory.');
  }
}

const O_NOFOLLOW_FLAG = typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0;

/**
 * TOCTOU-resistant UTF-8 file reader: opens the file descriptor directly with `O_NOFOLLOW`
 * (kernel-enforced symlink refusal) and verifies `fstatSync(fd).isFile()` before reading.
 */
function readFileNoFollow(targetPath: string): string {
  const fd = openSync(targetPath, fsConstants.O_RDONLY | O_NOFOLLOW_FLAG);
  try {
    const stats = fstatSync(fd);
    if (!stats.isFile()) {
      throw new Error('Security violation: target path is not a regular file.');
    }
    return readFileSync(fd, 'utf-8');
  } finally {
    closeSync(fd);
  }
}

/**
 * TOCTOU-resistant atomic file write: creates a unique temporary file exclusively
 * (`O_CREAT | O_EXCL | O_NOFOLLOW`, mode `0o600`), writes content via descriptor,
 * closes it, and atomically renames it into place.
 */
function writeFileAtomic(targetPath: string, content: string): void {
  assertNotSymlink(targetPath);
  const tmpPath = `${targetPath}${TEMP_FILE_MARKER}${randomBytes(6).toString('hex')}`;
  let fd: number | undefined;
  try {
    fd = openSync(
      tmpPath,
      fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW_FLAG,
      0o600,
    );
    writeSync(fd, content, 0, 'utf-8');
    closeSync(fd);
    fd = undefined;
    try {
      chmodSync(tmpPath, 0o600);
    } catch {
      // Ignore chmod failures on filesystems/OSes that do not support POSIX modes
    }
    renameSync(tmpPath, targetPath);
  } catch (err) {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // Best-effort fd cleanup
      }
    }
    try {
      if (existsSync(tmpPath)) {
        unlinkSync(tmpPath);
      }
    } catch {
      // Best-effort temp file cleanup
    }
    throw err;
  }
}

/**
 * Optional local-only disk persistence for SubtitleMe Companion.
 *
 * Security & Integrity guarantees:
 * - Disabled by default (`enabled: false`) until explicit user consent.
 * - Uses controlled private directory (`0o700`) and files (`0o600` on POSIX).
 * - Rejects symbolic links and path traversal outside `dataDir`.
 * - Generates random UUID internal filenames; client filenames are stored ONLY as metadata.
 * - Enforces atomic writes (temp + rename), cleans orphan `.tmp.*` files from interrupted writes,
 *   and enforces strict storage byte quotas.
 * - Validates and re-parses files during recovery, safely skipping corrupted records.
 * - Does NOT claim encryption-at-rest (`encryptedAtRest: false`).
 */
export class CompanionPersistence {
  private enabled: boolean;
  private readonly dataDir: string;
  private readonly maxStorageBytes: number;
  private readonly entriesById = new Map<string, PersistedIndexEntry>();
  private usedBytes = 0;
  private recoveredCount = 0;
  private corruptedSkippedCount = 0;
  private cleanedTempFiles = 0;

  public constructor(options: CompanionPersistenceOptions = {}) {
    this.enabled = options.enabled === true;
    this.dataDir = resolve(options.dataDir ?? getDefaultDataDir());
    this.maxStorageBytes = options.maxStorageBytes ?? DEFAULT_MAX_PERSISTENCE_BYTES;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.enabled) {
      this.ensureDataDir();
    }
  }

  public getDataDir(): string {
    return this.dataDir;
  }

  public getStatus(): CompanionStorageStatus {
    return {
      enabled: this.enabled,
      dataDir: this.dataDir,
      usedBytes: this.usedBytes,
      maxBytes: this.maxStorageBytes,
      trackCount: this.entriesById.size,
      recoveredCount: this.recoveredCount,
      corruptedSkippedCount: this.corruptedSkippedCount,
      cleanedTempFiles: this.cleanedTempFiles,
      encryptedAtRest: false,
    };
  }

  private ensureDataDir(): void {
    if (existsSync(this.dataDir)) {
      assertNotSymlink(this.dataDir);
    } else {
      mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
    }
    try {
      chmodSync(this.dataDir, 0o700);
    } catch {
      // Ignore on filesystems without POSIX permissions
    }
  }

  private getIndexPath(): string {
    return assertPathInsideDir(this.dataDir, join(this.dataDir, INDEX_FILENAME));
  }

  private cleanupOrphanTempFiles(): number {
    if (!existsSync(this.dataDir)) return 0;
    let cleaned = 0;
    try {
      const names = readdirSync(this.dataDir);
      for (const name of names) {
        if (!name.includes(TEMP_FILE_MARKER)) continue;
        const fullPath = assertPathInsideDir(this.dataDir, join(this.dataDir, name));
        const stats = lstatSync(fullPath);
        if (stats.isFile() && !stats.isSymbolicLink()) {
          unlinkSync(fullPath);
          cleaned += 1;
        }
      }
    } catch {
      // Non-fatal cleanup
    }
    return cleaned;
  }

  private flushIndex(): void {
    this.ensureDataDir();
    const doc: PersistedIndexDocument = {
      version: 1,
      entries: Array.from(this.entriesById.values()),
    };
    writeFileAtomic(this.getIndexPath(), JSON.stringify(doc, null, 2));
  }

  /**
   * Loads and validates persisted subtitle records from `dataDir`.
   * Cleans orphan `.tmp.*` files left by interrupted writes, rejects symlinks,
   * and skips corrupted records cleanly without crashing startup.
   */
  public loadAll(): PersistenceRecoveryResult {
    this.entriesById.clear();
    this.usedBytes = 0;
    this.recoveredCount = 0;
    this.corruptedSkippedCount = 0;
    this.cleanedTempFiles = 0;

    if (!this.enabled) {
      return { records: [], corruptedSkippedCount: 0, cleanedTempFiles: 0 };
    }

    this.cleanedTempFiles = this.cleanupOrphanTempFiles();

    const indexPath = this.getIndexPath();
    if (!existsSync(indexPath)) {
      return { records: [], corruptedSkippedCount: 0, cleanedTempFiles: this.cleanedTempFiles };
    }

    let parsedDoc: unknown;
    try {
      const rawIndex = readFileNoFollow(indexPath);
      parsedDoc = JSON.parse(rawIndex);
    } catch {
      this.corruptedSkippedCount += 1;
      return { records: [], corruptedSkippedCount: 1, cleanedTempFiles: this.cleanedTempFiles };
    }

    if (
      !parsedDoc ||
      typeof parsedDoc !== 'object' ||
      (parsedDoc as { version?: unknown }).version !== 1 ||
      !Array.isArray((parsedDoc as { entries?: unknown }).entries)
    ) {
      this.corruptedSkippedCount += 1;
      return { records: [], corruptedSkippedCount: 1, cleanedTempFiles: this.cleanedTempFiles };
    }

    const rawEntries = (parsedDoc as { entries: unknown[] }).entries;
    const recovered: Array<{ record: CompanionSubtitleRecord; sampleLines: readonly string[] }> = [];

    for (const rawEntry of rawEntries) {
      const validated = this.recoverSingleEntry(rawEntry);
      if (!validated) {
        this.corruptedSkippedCount += 1;
        continue;
      }

      if (this.usedBytes + validated.record.byteLength > this.maxStorageBytes) {
        this.corruptedSkippedCount += 1;
        continue;
      }

      this.entriesById.set(validated.record.id, validated.indexEntry);
      this.usedBytes += validated.record.byteLength;
      recovered.push({ record: validated.record, sampleLines: validated.sampleLines });
    }

    this.recoveredCount = recovered.length;

    // Rewrite index cleanly if corrupted entries were pruned
    if (this.corruptedSkippedCount > 0) {
      try {
        this.flushIndex();
      } catch {
        // Non-fatal during recovery
      }
    }

    return {
      records: recovered,
      corruptedSkippedCount: this.corruptedSkippedCount,
      cleanedTempFiles: this.cleanedTempFiles,
    };
  }

  private recoverSingleEntry(rawEntry: unknown): {
    indexEntry: PersistedIndexEntry;
    record: CompanionSubtitleRecord;
    sampleLines: readonly string[];
  } | null {
    if (!rawEntry || typeof rawEntry !== 'object') return null;
    const entry = rawEntry as Partial<PersistedIndexEntry>;

    if (typeof entry.id !== 'string' || !/^local-[a-zA-Z0-9-]{8,64}$/.test(entry.id)) {
      return null;
    }
    if (typeof entry.internalFile !== 'string' || !INTERNAL_FILE_RE.test(entry.internalFile)) {
      return null;
    }

    const contentIdCheck = validateContentId(entry.contentId);
    if (!contentIdCheck.valid || !contentIdCheck.normalized || !contentIdCheck.kind) {
      return null;
    }

    if (typeof entry.language !== 'string') return null;
    const langDesc = findLanguageDescriptor(entry.language);
    if (!langDesc) return null;

    const filenameCheck = validateSubtitleFilename(entry.filename);
    if (!filenameCheck.valid || !filenameCheck.filename || !filenameCheck.declaredFormat) {
      return null;
    }

    const filePath = assertPathInsideDir(this.dataDir, join(this.dataDir, entry.internalFile));
    if (!existsSync(filePath)) return null;

    let content: string;
    try {
      // Kernel-enforced O_NOFOLLOW prevents TOCTOU symlink escapes
      content = readFileNoFollow(filePath);
    } catch {
      return null;
    }

    const byteLength = Buffer.byteLength(content, 'utf-8');
    if (byteLength === 0 || byteLength > MAX_COMPANION_SUBTITLE_BYTES) {
      return null;
    }

    const parsed = parseSubtitle(content, filenameCheck.declaredFormat);
    if (parsed.status === 'error' || parsed.cues.length === 0) {
      return null;
    }

    const uploadedAt = typeof entry.uploadedAt === 'number' ? entry.uploadedAt : Date.now();
    const indexEntry: PersistedIndexEntry = {
      id: entry.id,
      contentId: contentIdCheck.normalized,
      associationKind: contentIdCheck.kind,
      language: langDesc.bcp47,
      format: filenameCheck.declaredFormat,
      filename: filenameCheck.filename,
      internalFile: entry.internalFile,
      byteLength,
      cueCount: parsed.cues.length,
      uploadedAt,
    };

    const record: CompanionSubtitleRecord = {
      id: indexEntry.id,
      contentId: indexEntry.contentId,
      associationKind: indexEntry.associationKind,
      language: indexEntry.language,
      format: indexEntry.format,
      filename: indexEntry.filename,
      content,
      byteLength,
      cueCount: parsed.cues.length,
      uploadedAt,
    };

    return {
      indexEntry,
      record,
      sampleLines: parsed.cues.slice(0, 2).map((cue) => cue.text),
    };
  }

  /**
   * Persists a validated subtitle record atomically under a random internal UUID filename.
   * Enforces the configured storage byte quota.
   */
  public saveRecord(record: CompanionSubtitleRecord): void {
    if (!this.enabled) return;

    const existing = this.entriesById.get(record.id);
    const projectedBytes = this.usedBytes - (existing?.byteLength ?? 0) + record.byteLength;
    if (projectedBytes > this.maxStorageBytes) {
      throw new Error(
        `Local persistence storage limit exceeded (${Math.floor(this.maxStorageBytes / (1024 * 1024))} MB max).`,
      );
    }

    this.ensureDataDir();

    const internalFile = `${randomUUID()}.${record.format}`;
    const filePath = assertPathInsideDir(this.dataDir, join(this.dataDir, internalFile));
    writeFileAtomic(filePath, record.content);

    // Remove previous internal file if updating the same ID
    if (existing) {
      this.safeDeleteFile(existing.internalFile);
      this.usedBytes = Math.max(0, this.usedBytes - existing.byteLength);
    }

    const indexEntry: PersistedIndexEntry = {
      id: record.id,
      contentId: record.contentId,
      associationKind: record.associationKind,
      language: record.language,
      format: record.format,
      filename: record.filename,
      internalFile,
      byteLength: record.byteLength,
      cueCount: record.cueCount,
      uploadedAt: record.uploadedAt,
    };

    this.entriesById.set(record.id, indexEntry);
    this.usedBytes += record.byteLength;
    this.flushIndex();
  }

  public deleteRecord(id: string): boolean {
    const existing = this.entriesById.get(id);
    if (!existing) return false;

    this.entriesById.delete(id);
    this.usedBytes = Math.max(0, this.usedBytes - existing.byteLength);
    this.safeDeleteFile(existing.internalFile);

    if (this.enabled) {
      this.flushIndex();
    }
    return true;
  }

  public clearAll(): void {
    for (const entry of this.entriesById.values()) {
      this.safeDeleteFile(entry.internalFile);
    }
    this.entriesById.clear();
    this.usedBytes = 0;
    this.recoveredCount = 0;
    this.corruptedSkippedCount = 0;

    if (existsSync(this.dataDir)) {
      this.cleanedTempFiles += this.cleanupOrphanTempFiles();
      const indexPath = this.getIndexPath();
      if (existsSync(indexPath)) {
        rmSync(indexPath, { force: true });
      }
    }
  }

  private safeDeleteFile(internalFile: string): void {
    if (!INTERNAL_FILE_RE.test(internalFile)) return;
    try {
      const filePath = assertPathInsideDir(this.dataDir, join(this.dataDir, internalFile));
      if (existsSync(filePath)) {
        assertNotSymlink(filePath);
        unlinkSync(filePath);
      }
    } catch {
      // Best-effort deletion
    }
  }
}
