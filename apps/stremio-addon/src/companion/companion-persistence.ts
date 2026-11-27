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
import {
  decryptJson,
  decryptText,
  encryptJson,
  encryptText,
  isEncryptedEnvelope,
} from '../security/data-cipher';
import { PersistenceKeyManager } from '../security/key-manager';
import { createOsKeyVault } from '../security/os-key-vault';
import type { KeyVault } from '../security/secret-vault';
import { MAX_COMPANION_SUBTITLE_BYTES } from './companion-config';
import type { CompanionSubtitleRecord, ContentAssociationKind } from './companion-types';
import { validateContentId, validateSubtitleFilename } from './companion-validation';

export const DEFAULT_MAX_PERSISTENCE_BYTES = 50 * 1024 * 1024; // 50 MB default quota
const INDEX_FILENAME = 'index.json';
const INTERNAL_FILE_RE = /^[a-f0-9-]{36}\.(srt|vtt)$/;
const TEMP_FILE_MARKER = '.tmp.';
const INDEX_PURPOSE = 'index';

function subtitlePurpose(id: string): string {
  return `subtitle:${id}`;
}

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
  /** Optional custom OS key vault (primarily for dependency injection in tests). */
  keyVault?: KeyVault;
  /** Optional pre-configured PersistenceKeyManager. */
  keyManager?: PersistenceKeyManager;
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
  readonly encryptedAtRest: boolean;
  readonly vaultBackend: string;
}

export interface PersistenceRecoveryResult {
  readonly records: Array<{ record: CompanionSubtitleRecord; sampleLines: readonly string[] }>;
  readonly corruptedSkippedCount: number;
  readonly cleanedTempFiles: number;
  readonly migratedLegacyCount?: number;
}

export interface LegacyFileMigrationResult<T> {
  readonly migrated: boolean;
  readonly data: T | null;
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
 * Optional local-only encrypted disk persistence for SubtitleMe Companion.
 *
 * Security & Integrity guarantees:
 * - Disabled by default (`enabled: false`) until explicit user consent.
 * - Uses OS native credential vault via `PersistenceKeyManager` (fail-closed: NEVER falls back to plaintext).
 * - Encrypts all persisted files at rest using AES-256-GCM (unique 96-bit IV + 128-bit auth tag + AAD).
 * - Uses controlled private directory (`0o700`) and files (`0o600` on POSIX).
 * - Rejects symbolic links and path traversal outside `dataDir`.
 * - Enforces atomic writes (temp + rename), cleans orphan `.tmp.*` files, and supports safe
 *   non-destructive migration of legacy plaintext files.
 */
export class CompanionPersistence {
  private enabled: boolean;
  private encryptionActive = false;
  private readonly dataDir: string;
  private readonly maxStorageBytes: number;
  private readonly keyManager: PersistenceKeyManager;
  private readonly entriesById = new Map<string, PersistedIndexEntry>();
  private usedBytes = 0;
  private recoveredCount = 0;
  private corruptedSkippedCount = 0;
  private cleanedTempFiles = 0;

  public constructor(options: CompanionPersistenceOptions = {}) {
    this.enabled = options.enabled === true;
    this.dataDir = resolve(options.dataDir ?? getDefaultDataDir());
    this.maxStorageBytes = options.maxStorageBytes ?? DEFAULT_MAX_PERSISTENCE_BYTES;
    this.keyManager =
      options.keyManager ?? new PersistenceKeyManager(options.keyVault ?? createOsKeyVault());

    if (this.enabled) {
      // Fail-closed immediately if OS vault is unavailable when persistence is requested
      this.requireKey();
    }
  }

  private requireKey(): Buffer {
    const key = this.keyManager.getOrCreateKey();
    this.encryptionActive = true;
    return key;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    if (enabled) {
      // Verify OS vault before activating persistence (fail-closed, never plaintext)
      this.requireKey();
      this.enabled = true;
      this.ensureDataDir();
    } else {
      this.enabled = false;
      this.encryptionActive = false;
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
      encryptedAtRest: this.enabled && this.encryptionActive,
      vaultBackend: this.keyManager.getBackendName(),
    };
  }

  public dispose(): void {
    this.keyManager.dispose();
    this.encryptionActive = false;
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

  /**
   * Atomically encrypts and writes a JSON document inside `dataDir` with AES-256-GCM + AAD.
   * Fail-closed: throws if OS vault is unavailable; never writes plaintext.
   */
  public writeEncryptedJsonFile(fileName: string, purpose: string, value: unknown): void {
    if (!this.enabled) return;
    const key = this.requireKey();
    try {
      this.ensureDataDir();
      const targetPath = assertPathInsideDir(this.dataDir, join(this.dataDir, fileName));
      const encrypted = encryptJson(value, key, purpose);
      writeFileAtomic(targetPath, encrypted);
    } finally {
      key.fill(0);
    }
  }

  /**
   * Reads and authenticates an encrypted JSON document inside `dataDir`.
   * Returns `null` if the file does not exist. Throws `CryptoIntegrityError` on tampering/corruption.
   */
  public readEncryptedJsonFile<T = unknown>(fileName: string, purpose: string): T | null {
    if (!this.enabled) return null;
    const targetPath = assertPathInsideDir(this.dataDir, join(this.dataDir, fileName));
    if (!existsSync(targetPath)) return null;
    const key = this.requireKey();
    try {
      const raw = readFileNoFollow(targetPath);
      return decryptJson<T>(raw, key, purpose);
    } finally {
      key.fill(0);
    }
  }

  /**
   * Safely migrates a legacy plaintext JSON file (e.g. `providers.json` -> `providers.enc.json`):
   * 1. Reads and validates legacy JSON without modifying it.
   * 2. Encrypts and writes the new `.enc.json` file atomically.
   * 3. Re-reads and decrypts the new file to verify integrity & exact content match.
   * 4. ONLY AFTER verified decryption succeeds, removes the legacy plaintext file.
   */
  public migrateLegacyJsonFile<T>(
    legacyFileName: string,
    encryptedFileName: string,
    purpose: string,
    normalize?: (parsed: Record<string, unknown>) => T,
  ): LegacyFileMigrationResult<T> {
    if (!this.enabled) return { migrated: false, data: null };

    const legacyPath = assertPathInsideDir(this.dataDir, join(this.dataDir, legacyFileName));
    const encPath = assertPathInsideDir(this.dataDir, join(this.dataDir, encryptedFileName));

    if (!existsSync(legacyPath)) {
      return { migrated: false, data: null };
    }

    // If encrypted file already exists and decrypts validly, remove leftover legacy file safely
    if (existsSync(encPath)) {
      const existingData = this.readEncryptedJsonFile<T>(encryptedFileName, purpose);
      if (existingData !== null) {
        assertNotSymlink(legacyPath);
        unlinkSync(legacyPath);
        return { migrated: true, data: existingData };
      }
    }

    const key = this.requireKey();
    try {
      const rawLegacy = readFileNoFollow(legacyPath);
      const parsed = JSON.parse(rawLegacy) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Legacy file ${legacyFileName} does not contain a JSON object.`);
      }
      const data = normalize ? normalize(parsed) : (parsed as unknown as T);

      this.ensureDataDir();
      const encrypted = encryptJson(data, key, purpose);
      writeFileAtomic(encPath, encrypted);

      // Verify round-trip decryption before deleting original legacy file
      const writtenRaw = readFileNoFollow(encPath);
      const verified = decryptJson<T>(writtenRaw, key, purpose);
      if (JSON.stringify(verified) !== JSON.stringify(data)) {
        throw new Error(`Migration verification mismatch for ${encryptedFileName}.`);
      }

      assertNotSymlink(legacyPath);
      unlinkSync(legacyPath);
      return { migrated: true, data: verified };
    } finally {
      key.fill(0);
    }
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
    const key = this.requireKey();
    try {
      this.ensureDataDir();
      const doc: PersistedIndexDocument = {
        version: 1,
        entries: Array.from(this.entriesById.values()),
      };
      const encrypted = encryptJson(doc, key, INDEX_PURPOSE);
      writeFileAtomic(this.getIndexPath(), encrypted);
    } finally {
      key.fill(0);
    }
  }

  /**
   * Loads and validates persisted encrypted subtitle records from `dataDir`.
   * Automatically and safely migrates legacy plaintext `index.json` + `.srt`/`.vtt` files
   * (encrypting to new files and verifying decryption BEFORE deleting legacy plaintext files).
   */
  public loadAll(): PersistenceRecoveryResult {
    this.entriesById.clear();
    this.usedBytes = 0;
    this.recoveredCount = 0;
    this.corruptedSkippedCount = 0;
    this.cleanedTempFiles = 0;

    if (!this.enabled) {
      return { records: [], corruptedSkippedCount: 0, cleanedTempFiles: 0, migratedLegacyCount: 0 };
    }

    const key = this.requireKey();
    try {
      this.cleanedTempFiles = this.cleanupOrphanTempFiles();

      const indexPath = this.getIndexPath();
      if (!existsSync(indexPath)) {
        return {
          records: [],
          corruptedSkippedCount: 0,
          cleanedTempFiles: this.cleanedTempFiles,
          migratedLegacyCount: 0,
        };
      }

      let rawIndex: string;
      try {
        rawIndex = readFileNoFollow(indexPath);
      } catch {
        this.corruptedSkippedCount += 1;
        return {
          records: [],
          corruptedSkippedCount: 1,
          cleanedTempFiles: this.cleanedTempFiles,
          migratedLegacyCount: 0,
        };
      }

      const isLegacyPlaintextIndex = !isEncryptedEnvelope(rawIndex);
      let parsedDoc: unknown;
      try {
        parsedDoc = isLegacyPlaintextIndex
          ? JSON.parse(rawIndex)
          : decryptJson<PersistedIndexDocument>(rawIndex, key, INDEX_PURPOSE);
      } catch {
        this.corruptedSkippedCount += 1;
        return {
          records: [],
          corruptedSkippedCount: 1,
          cleanedTempFiles: this.cleanedTempFiles,
          migratedLegacyCount: 0,
        };
      }

      if (
        !parsedDoc ||
        typeof parsedDoc !== 'object' ||
        (parsedDoc as { version?: unknown }).version !== 1 ||
        !Array.isArray((parsedDoc as { entries?: unknown }).entries)
      ) {
        this.corruptedSkippedCount += 1;
        return {
          records: [],
          corruptedSkippedCount: 1,
          cleanedTempFiles: this.cleanedTempFiles,
          migratedLegacyCount: 0,
        };
      }

      const rawEntries = (parsedDoc as { entries: unknown[] }).entries;
      const recovered: Array<{ record: CompanionSubtitleRecord; sampleLines: readonly string[] }> = [];
      const legacyFilesToRemove: string[] = [];
      let migratedLegacyCount = 0;

      for (const rawEntry of rawEntries) {
        const validated = this.recoverSingleEntry(rawEntry, key, isLegacyPlaintextIndex);
        if (!validated) {
          this.corruptedSkippedCount += 1;
          continue;
        }

        if (this.usedBytes + validated.record.byteLength > this.maxStorageBytes) {
          this.corruptedSkippedCount += 1;
          continue;
        }

        let finalIndexEntry = validated.indexEntry;
        if (validated.wasLegacyPlaintext) {
          // Encrypt into a new random internal file and verify decryption BEFORE touching original
          const newInternalFile = `${randomUUID()}.${validated.record.format}`;
          const newFilePath = assertPathInsideDir(this.dataDir, join(this.dataDir, newInternalFile));
          const encryptedContent = encryptText(
            validated.record.content,
            key,
            subtitlePurpose(validated.record.id),
          );
          writeFileAtomic(newFilePath, encryptedContent);

          // Verify round-trip decryption
          const verifyDecrypted = decryptText(
            readFileNoFollow(newFilePath),
            key,
            subtitlePurpose(validated.record.id),
          );
          if (verifyDecrypted !== validated.record.content) {
            throw new Error('Subtitle migration verification failed.');
          }

          legacyFilesToRemove.push(validated.indexEntry.internalFile);
          finalIndexEntry = { ...validated.indexEntry, internalFile: newInternalFile };
          migratedLegacyCount += 1;
        }

        this.entriesById.set(validated.record.id, finalIndexEntry);
        this.usedBytes += validated.record.byteLength;
        recovered.push({ record: validated.record, sampleLines: validated.sampleLines });
      }

      this.recoveredCount = recovered.length;

      // Atomically persist encrypted index (on migration or corrupted entry pruning)
      if (isLegacyPlaintextIndex || migratedLegacyCount > 0 || this.corruptedSkippedCount > 0) {
        this.flushIndex();
        // Verify encrypted index decrypts cleanly before removing legacy plaintext subtitle files
        const verifiedIndex = decryptJson<PersistedIndexDocument>(
          readFileNoFollow(indexPath),
          key,
          INDEX_PURPOSE,
        );
        if (verifiedIndex.version === 1) {
          for (const oldInternalFile of legacyFilesToRemove) {
            this.safeDeleteFile(oldInternalFile);
          }
        }
      }

      return {
        records: recovered,
        corruptedSkippedCount: this.corruptedSkippedCount,
        cleanedTempFiles: this.cleanedTempFiles,
        migratedLegacyCount,
      };
    } finally {
      key.fill(0);
    }
  }

  private recoverSingleEntry(
    rawEntry: unknown,
    key: Buffer,
    allowLegacyPlaintext: boolean,
  ): {
    indexEntry: PersistedIndexEntry;
    record: CompanionSubtitleRecord;
    sampleLines: readonly string[];
    wasLegacyPlaintext: boolean;
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

    let rawContent: string;
    try {
      rawContent = readFileNoFollow(filePath);
    } catch {
      return null;
    }

    let content: string;
    let wasLegacyPlaintext = false;
    if (isEncryptedEnvelope(rawContent)) {
      try {
        content = decryptText(rawContent, key, subtitlePurpose(entry.id));
      } catch {
        return null;
      }
    } else if (allowLegacyPlaintext) {
      content = rawContent;
      wasLegacyPlaintext = true;
    } else {
      // Encrypted index must never silently accept unencrypted/tampered subtitle files
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
      wasLegacyPlaintext,
    };
  }

  /**
   * Persists a validated subtitle record encrypted with AES-256-GCM under a random internal UUID.
   * Enforces the configured storage byte quota. Fail-closed if OS vault is unavailable.
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

    const key = this.requireKey();
    try {
      this.ensureDataDir();

      const internalFile = `${randomUUID()}.${record.format}`;
      const filePath = assertPathInsideDir(this.dataDir, join(this.dataDir, internalFile));
      const encryptedContent = encryptText(record.content, key, subtitlePurpose(record.id));
      writeFileAtomic(filePath, encryptedContent);

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
    } finally {
      key.fill(0);
    }
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
