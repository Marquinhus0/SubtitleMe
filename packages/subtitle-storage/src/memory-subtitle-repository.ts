import {
  SubtitleStorageError,
  estimateRecordBytes,
  type LocalSubtitleRecord,
  type LocalSubtitleRepository,
  type LocalSubtitleUpdatePatch,
  type SubtitleStorageUsage,
} from './local-subtitle-types';

/**
 * In-memory LocalSubtitleRepository implementation used as a graceful fallback
 * when IndexedDB is unavailable or for lightweight unit tests.
 */
export function createMemorySubtitleRepository(): LocalSubtitleRepository {
  const records = new Map<string, LocalSubtitleRecord>();

  return {
    async saveSubtitle(record: LocalSubtitleRecord): Promise<LocalSubtitleRecord> {
      for (const existing of records.values()) {
        if (existing.contentHash === record.contentHash || existing.id === record.id) {
          throw new SubtitleStorageError('DUPLICATE_IMPORT', 'This subtitle file is already stored.');
        }
      }
      const cloned = structuredClone(record);
      records.set(cloned.id, cloned);
      return cloned;
    },

    async getSubtitle(id: string): Promise<LocalSubtitleRecord | null> {
      const found = records.get(id);
      return found ? structuredClone(found) : null;
    },

    async getAllSubtitles(): Promise<LocalSubtitleRecord[]> {
      return Array.from(records.values())
        .map((r) => structuredClone(r))
        .sort((a, b) => b.importedAt - a.importedAt);
    },

    async updateSubtitle(
      id: string,
      patch: LocalSubtitleUpdatePatch,
    ): Promise<LocalSubtitleRecord> {
      const existing = records.get(id);
      if (!existing) {
        throw new SubtitleStorageError('NOT_FOUND', `Subtitle record "${id}" does not exist.`);
      }
      const updated: LocalSubtitleRecord = {
        ...existing,
        ...(patch.language !== undefined ? { language: patch.language } : {}),
        ...(patch.fileName !== undefined ? { fileName: patch.fileName } : {}),
        ...(patch.cues !== undefined ? { cues: structuredClone(patch.cues) } : {}),
        ...(patch.cueCount !== undefined ? { cueCount: patch.cueCount } : {}),
        ...(patch.durationMs !== undefined ? { durationMs: patch.durationMs } : {}),
        updatedAt: Date.now(),
      };
      records.set(id, structuredClone(updated));
      return updated;
    },

    async deleteSubtitle(id: string): Promise<boolean> {
      return records.delete(id);
    },

    async clearAllSubtitles(): Promise<void> {
      records.clear();
    },

    async getStorageUsage(): Promise<SubtitleStorageUsage> {
      let totalCues = 0;
      let estimatedBytes = 0;
      for (const record of records.values()) {
        totalCues += record.cueCount;
        estimatedBytes += estimateRecordBytes(record);
      }
      return {
        recordCount: records.size,
        totalCues,
        estimatedBytes,
      };
    },

    close(): void {
      // No-op for memory adapter
    },
  };
}
