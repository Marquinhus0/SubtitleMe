import {
  cloneDefaultSettings,
  sanitizeSettings,
  type SubtitleMeSettings,
} from '@subtitleme/shared-types';

export const SETTINGS_STORAGE_KEY = 'subtitleme.settings';

/**
 * Minimal key-value storage abstraction so settings persistence stays
 * independent of browser-specific APIs and easily unit-testable.
 */
export interface StorageAreaAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface SettingsRepository {
  load(): Promise<SubtitleMeSettings>;
  save(settings: SubtitleMeSettings): Promise<SubtitleMeSettings>;
  reset(): Promise<SubtitleMeSettings>;
  clear(): Promise<void>;
}

export function createMemoryStorageAdapter(): StorageAreaAdapter {
  const store = new Map<string, unknown>();
  return {
    async get(key: string): Promise<unknown> {
      const value = store.get(key);
      return value === undefined ? undefined : structuredClone(value);
    },
    async set(key: string, value: unknown): Promise<void> {
      store.set(key, structuredClone(value));
    },
    async remove(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

export function createSettingsRepository(
  adapter: StorageAreaAdapter,
  storageKey = SETTINGS_STORAGE_KEY,
): SettingsRepository {
  return {
    async load(): Promise<SubtitleMeSettings> {
      try {
        const raw = await adapter.get(storageKey);
        if (raw === undefined || raw === null) {
          return cloneDefaultSettings();
        }
        return sanitizeSettings(raw);
      } catch {
        return cloneDefaultSettings();
      }
    },

    async save(settings: SubtitleMeSettings): Promise<SubtitleMeSettings> {
      const sanitized = sanitizeSettings(settings);
      await adapter.set(storageKey, sanitized);
      return sanitized;
    },

    async reset(): Promise<SubtitleMeSettings> {
      const defaults = cloneDefaultSettings();
      await adapter.set(storageKey, defaults);
      return defaults;
    },

    async clear(): Promise<void> {
      await adapter.remove(storageKey);
    },
  };
}
