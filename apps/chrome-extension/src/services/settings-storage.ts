import { sanitizeSettings, type SubtitleMeSettings } from '@subtitleme/shared-types';
import {
  SETTINGS_STORAGE_KEY,
  createMemoryStorageAdapter,
  createSettingsRepository,
  type SettingsRepository,
  type StorageAreaAdapter,
} from '@subtitleme/subtitle-storage';

function hasChromeLocalStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

function createChromeStorageAdapter(): StorageAreaAdapter {
  return {
    async get(key: string): Promise<unknown> {
      const result = await chrome.storage.local.get(key);
      return result[key];
    },
    async set(key: string, value: unknown): Promise<void> {
      await chrome.storage.local.set({ [key]: value });
    },
    async remove(key: string): Promise<void> {
      await chrome.storage.local.remove(key);
    },
  };
}

function createLocalStorageAdapter(): StorageAreaAdapter {
  return {
    async get(key: string): Promise<unknown> {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as unknown;
    },
    async set(key: string, value: unknown): Promise<void> {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    async remove(key: string): Promise<void> {
      window.localStorage.removeItem(key);
    },
  };
}

export function createExtensionSettingsRepository(): SettingsRepository {
  if (hasChromeLocalStorage()) {
    return createSettingsRepository(createChromeStorageAdapter(), SETTINGS_STORAGE_KEY);
  }
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return createSettingsRepository(createLocalStorageAdapter(), SETTINGS_STORAGE_KEY);
  }
  return createSettingsRepository(createMemoryStorageAdapter(), SETTINGS_STORAGE_KEY);
}

/**
 * Subscribes to external Chrome Storage changes so the popup and options page
 * remain synchronized immediately without polling.
 */
export function subscribeSettingsChanges(
  onChange: (settings: SubtitleMeSettings) => void,
): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
    return () => undefined;
  }

  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') return;
    const change = changes[SETTINGS_STORAGE_KEY];
    if (!change || change.newValue === undefined) return;
    onChange(sanitizeSettings(change.newValue));
  };

  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
