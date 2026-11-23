import {
  SubtitleStorageError,
  estimateRecordBytes,
  type LocalSubtitleRecord,
  type LocalSubtitleRepository,
  type LocalSubtitleUpdatePatch,
  type StorageErrorCode,
  type SubtitleStorageUsage,
} from './local-subtitle-types';

export const SUBTITLE_DB_NAME = 'subtitleme-local-subtitles';
export const SUBTITLE_DB_VERSION = 1;
export const SUBTITLE_STORE_NAME = 'subtitles';

export interface IndexedDbRepositoryOptions {
  dbName?: string;
  dbVersion?: number;
  idbFactory?: IDBFactory;
}

function mapDomError(error: unknown, fallbackCode: StorageErrorCode): SubtitleStorageError {
  if (error instanceof SubtitleStorageError) {
    return error;
  }
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : 'IndexedDB operation failed';
  if (name === 'QuotaExceededError') {
    return new SubtitleStorageError('QUOTA_EXCEEDED', 'Local browser storage quota exceeded.');
  }
  if (name === 'ConstraintError') {
    return new SubtitleStorageError('DUPLICATE_IMPORT', 'This subtitle file is already stored.');
  }
  return new SubtitleStorageError(fallbackCode, message);
}

/**
 * Applies versioned IndexedDB schema migrations cleanly during `onupgradeneeded`.
 */
function runSchemaMigrations(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    const store = db.createObjectStore(SUBTITLE_STORE_NAME, { keyPath: 'id' });
    store.createIndex('by_language', 'language', { unique: false });
    store.createIndex('by_contentHash', 'contentHash', { unique: true });
    store.createIndex('by_importedAt', 'importedAt', { unique: false });
  }
}

/**
 * IndexedDB-backed persistent repository for locally imported subtitle files.
 * Isolates all IDB transactions and error handling from UI and Pinia layers.
 */
export function createIndexedDbSubtitleRepository(
  options: IndexedDbRepositoryOptions = {},
): LocalSubtitleRepository {
  const dbName = options.dbName ?? SUBTITLE_DB_NAME;
  const dbVersion = options.dbVersion ?? SUBTITLE_DB_VERSION;
  const idbFactory =
    options.idbFactory ?? (typeof indexedDB !== 'undefined' ? indexedDB : undefined);

  let dbPromise: Promise<IDBDatabase> | null = null;

  function openDatabase(): Promise<IDBDatabase> {
    if (!idbFactory) {
      return Promise.reject(
        new SubtitleStorageError('STORAGE_UNAVAILABLE', 'IndexedDB is not available in this environment.'),
      );
    }

    if (!dbPromise) {
      dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        try {
          const request = idbFactory.open(dbName, dbVersion);

          request.onupgradeneeded = (event) => {
            const db = request.result;
            runSchemaMigrations(db, event.oldVersion);
          };

          request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => {
              db.close();
              dbPromise = null;
            };
            resolve(db);
          };

          request.onerror = () => {
            dbPromise = null;
            reject(mapDomError(request.error, 'STORAGE_UNAVAILABLE'));
          };

          request.onblocked = () => {
            dbPromise = null;
            reject(
              new SubtitleStorageError(
                'STORAGE_UNAVAILABLE',
                'Database upgrade blocked by another open tab.',
              ),
            );
          };
        } catch (error) {
          dbPromise = null;
          reject(mapDomError(error, 'STORAGE_UNAVAILABLE'));
        }
      });
    }

    return dbPromise;
  }

  function runTransaction<T>(
    mode: IDBTransactionMode,
    fallbackCode: StorageErrorCode,
    executor: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return openDatabase().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          try {
            const tx = db.transaction(SUBTITLE_STORE_NAME, mode);
            const store = tx.objectStore(SUBTITLE_STORE_NAME);
            const req = executor(store);
            let settledResult: T;

            req.onsuccess = () => {
              settledResult = req.result;
            };
            req.onerror = () => {
              reject(mapDomError(req.error, fallbackCode));
            };
            tx.oncomplete = () => {
              resolve(settledResult);
            };
            tx.onerror = () => {
              reject(mapDomError(tx.error, fallbackCode));
            };
            tx.onabort = () => {
              reject(mapDomError(tx.error, fallbackCode));
            };
          } catch (error) {
            reject(mapDomError(error, fallbackCode));
          }
        }),
    );
  }

  return {
    async saveSubtitle(record: LocalSubtitleRecord): Promise<LocalSubtitleRecord> {
      const cloned = structuredClone(record);
      await runTransaction('readwrite', 'WRITE_FAILED', (store) => store.add(cloned));
      return cloned;
    },

    async getSubtitle(id: string): Promise<LocalSubtitleRecord | null> {
      const result = await runTransaction<LocalSubtitleRecord | undefined>(
        'readonly',
        'READ_FAILED',
        (store) => store.get(id),
      );
      return result ?? null;
    },

    async getAllSubtitles(): Promise<LocalSubtitleRecord[]> {
      const records = await runTransaction<LocalSubtitleRecord[]>(
        'readonly',
        'READ_FAILED',
        (store) => store.getAll(),
      );
      return records.sort((a, b) => b.importedAt - a.importedAt);
    },

    async updateSubtitle(
      id: string,
      patch: LocalSubtitleUpdatePatch,
    ): Promise<LocalSubtitleRecord> {
      const existing = await this.getSubtitle(id);
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

      await runTransaction('readwrite', 'WRITE_FAILED', (store) => store.put(updated));
      return updated;
    },

    async deleteSubtitle(id: string): Promise<boolean> {
      const existing = await this.getSubtitle(id);
      if (!existing) return false;
      await runTransaction('readwrite', 'DELETE_FAILED', (store) => store.delete(id));
      return true;
    },

    async clearAllSubtitles(): Promise<void> {
      await runTransaction('readwrite', 'DELETE_FAILED', (store) => store.clear());
    },

    async getStorageUsage(): Promise<SubtitleStorageUsage> {
      const records = await this.getAllSubtitles();
      let totalCues = 0;
      let estimatedBytes = 0;
      for (const record of records) {
        totalCues += record.cueCount;
        estimatedBytes += estimateRecordBytes(record);
      }
      return {
        recordCount: records.length,
        totalCues,
        estimatedBytes,
      };
    },

    close(): void {
      if (dbPromise) {
        void dbPromise.then((db) => db.close()).catch(() => undefined);
        dbPromise = null;
      }
    },
  };
}
