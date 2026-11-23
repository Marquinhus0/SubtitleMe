import { randomUUID } from 'node:crypto';
import { MAX_COMPANION_STORED_TRACKS } from './companion-config';
import type { CompanionPersistence, CompanionStorageStatus } from './companion-persistence';
import type { CompanionSubtitleRecord, CompanionSubtitleSummary } from './companion-types';
import type { ValidatedSubtitleUpload } from './companion-validation';

export interface CompanionStoreOptions {
  maxTracks?: number;
  onTrackInvalidated?: (sourceId: string) => void;
  persistence?: CompanionPersistence;
}

/**
 * In-memory local subtitle registry for the SubtitleMe Companion,
 * optionally backed by `CompanionPersistence` for recovery across restarts.
 *
 * Key invariants:
 * - Explicit association by normalized `(contentId.toLowerCase(), language.toLowerCase())`.
 * - Prevents duplicates: uploading a new track for the same `(contentId, language)`
 *   replaces the previous track (both in memory and on disk) and triggers derived cache invalidation.
 * - Removing or clearing tracks triggers `onTrackInvalidated(sourceId)` so any cached combined VTT
 *   derived from that track is immediately evicted.
 * - Never writes full subtitle contents to logs or external storage.
 */
export class CompanionSubtitleStore {
  private readonly maxTracks: number;
  private readonly onTrackInvalidated: ((sourceId: string) => void) | undefined;
  private readonly persistence: CompanionPersistence | undefined;
  private readonly byId = new Map<string, CompanionSubtitleRecord>();
  private readonly sampleLinesById = new Map<string, readonly string[]>();
  /** Maps `${contentId.toLowerCase()}::${language.toLowerCase()}` -> record id. */
  private readonly byContentAndLang = new Map<string, string>();

  public constructor(options: CompanionStoreOptions = {}) {
    this.maxTracks = options.maxTracks ?? MAX_COMPANION_STORED_TRACKS;
    this.onTrackInvalidated = options.onTrackInvalidated;
    this.persistence = options.persistence;

    if (this.persistence?.isEnabled()) {
      this.recoverFromPersistence();
    }
  }

  private buildCompositeKey(contentId: string, language: string): string {
    return `${contentId.trim().toLowerCase()}::${language.trim().toLowerCase()}`;
  }

  /**
   * Rebuilds the in-memory index from persisted local subtitle files.
   */
  public recoverFromPersistence(): number {
    if (!this.persistence || !this.persistence.isEnabled()) {
      return 0;
    }

    const result = this.persistence.loadAll();
    for (const { record, sampleLines } of result.records) {
      const compositeKey = this.buildCompositeKey(record.contentId, record.language);
      const existingId = this.byContentAndLang.get(compositeKey);
      if (existingId) {
        this.byId.delete(existingId);
        this.sampleLinesById.delete(existingId);
      }
      this.byId.set(record.id, record);
      this.sampleLinesById.set(record.id, sampleLines);
      this.byContentAndLang.set(compositeKey, record.id);
    }

    return result.records.length;
  }

  /**
   * Toggles local disk persistence with explicit user consent.
   * When enabled, flushes current in-memory tracks to disk; when disabled, stops writing to disk.
   */
  public setPersistenceEnabled(enabled: boolean): CompanionStorageStatus | null {
    if (!this.persistence) {
      return null;
    }

    this.persistence.setEnabled(enabled);
    if (enabled) {
      for (const record of this.byId.values()) {
        this.persistence.saveRecord(record);
      }
    }
    return this.persistence.getStatus();
  }

  public getStorageStatus(): CompanionStorageStatus | null {
    return this.persistence ? this.persistence.getStatus() : null;
  }

  public upsert(validated: ValidatedSubtitleUpload): CompanionSubtitleSummary {
    const compositeKey = this.buildCompositeKey(validated.contentId, validated.language);
    const existingId = this.byContentAndLang.get(compositeKey);

    const id = `local-${randomUUID()}`;
    const record: CompanionSubtitleRecord = {
      id,
      contentId: validated.contentId,
      associationKind: validated.associationKind,
      language: validated.language,
      format: validated.format,
      filename: validated.filename,
      content: validated.content,
      byteLength: validated.byteLength,
      cueCount: validated.cueCount,
      uploadedAt: Date.now(),
    };

    // Persist first (if enabled) so storage quota errors leave existing state intact
    if (this.persistence?.isEnabled()) {
      if (existingId) {
        // Delete replaced record from disk quota accounting before saving replacement
        this.persistence.deleteRecord(existingId);
      }
      this.persistence.saveRecord(record);
    }

    if (existingId) {
      this.byId.delete(existingId);
      this.sampleLinesById.delete(existingId);
      this.onTrackInvalidated?.(existingId);
    } else if (this.byId.size >= this.maxTracks) {
      const oldestId = this.byId.keys().next().value;
      if (oldestId !== undefined) {
        this.removeById(oldestId);
      }
    }

    this.byId.set(id, record);
    this.sampleLinesById.set(id, validated.sampleLines);
    this.byContentAndLang.set(compositeKey, id);

    return this.toSummary(record);
  }

  public findByContentAndLanguage(
    contentId: string,
    language: string,
  ): CompanionSubtitleRecord | null {
    const compositeKey = this.buildCompositeKey(contentId, language);
    const id = this.byContentAndLang.get(compositeKey);
    if (!id) return null;
    return this.byId.get(id) ?? null;
  }

  public getById(id: string): CompanionSubtitleRecord | null {
    return this.byId.get(id) ?? null;
  }

  public listSummaries(): CompanionSubtitleSummary[] {
    return Array.from(this.byId.values()).map((record) => this.toSummary(record));
  }

  public removeById(id: string): boolean {
    const existing = this.byId.get(id);
    if (!existing) return false;

    const compositeKey = this.buildCompositeKey(existing.contentId, existing.language);
    this.byId.delete(id);
    this.sampleLinesById.delete(id);
    if (this.byContentAndLang.get(compositeKey) === id) {
      this.byContentAndLang.delete(compositeKey);
    }

    this.persistence?.deleteRecord(id);
    this.onTrackInvalidated?.(id);
    return true;
  }

  public clear(): void {
    const ids = Array.from(this.byId.keys());
    this.byId.clear();
    this.sampleLinesById.clear();
    this.byContentAndLang.clear();
    this.persistence?.clearAll();
    for (const id of ids) {
      this.onTrackInvalidated?.(id);
    }
  }

  public count(): number {
    return this.byId.size;
  }

  private toSummary(record: CompanionSubtitleRecord): CompanionSubtitleSummary {
    return {
      id: record.id,
      contentId: record.contentId,
      associationKind: record.associationKind,
      language: record.language,
      format: record.format,
      filename: record.filename,
      byteLength: record.byteLength,
      cueCount: record.cueCount,
      uploadedAt: record.uploadedAt,
      sampleLines: this.sampleLinesById.get(record.id) ?? [],
    };
  }
}
