import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DEFAULT_SETTINGS } from '@subtitleme/shared-types';
import {
  createMemoryStorageAdapter,
  createSettingsRepository,
  type StorageAreaAdapter,
} from '@subtitleme/subtitle-storage';
import {
  setSettingsRepository,
  useSettingsStore,
} from '../../apps/chrome-extension/src/stores/settings.store';

describe('Settings persistence and Pinia store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('persists language, appearance, and sync settings across store re-initialization', async () => {
    const adapter = createMemoryStorageAdapter();
    const repo = createSettingsRepository(adapter);
    setSettingsRepository(repo);

    const store = useSettingsStore();
    await store.initialize();
    await store.setUiLanguage('pt-BR');
    await store.updateAppearance({ fontSize: 32, primaryColor: '#FFE58F', position: 'top' });
    await store.updateSync({ primaryOffsetMs: 400, secondaryOffsetMs: -200 });

    // Simulate reopening Chrome popup / options with a fresh Pinia instance
    setActivePinia(createPinia());
    const reloadedStore = useSettingsStore();
    await reloadedStore.initialize();

    expect(reloadedStore.settings.general.uiLanguage).toBe('pt-BR');
    expect(reloadedStore.settings.appearance.fontSize).toBe(32);
    expect(reloadedStore.settings.appearance.primaryColor).toBe('#FFE58F');
    expect(reloadedStore.settings.appearance.position).toBe('top');
    expect(reloadedStore.settings.sync.primaryOffsetMs).toBe(400);
    expect(reloadedStore.settings.sync.secondaryOffsetMs).toBe(-200);
  });

  it('resets configuration back to DEFAULT_SETTINGS and persists the reset', async () => {
    const adapter = createMemoryStorageAdapter();
    const repo = createSettingsRepository(adapter);
    setSettingsRepository(repo);

    const store = useSettingsStore();
    await store.initialize();
    await store.setUiLanguage('pt-BR');
    await store.updateAppearance({ fontSize: 40 });
    await store.resetToDefaults();

    expect(store.settings).toEqual(DEFAULT_SETTINGS);

    const persisted = await repo.load();
    expect(persisted).toEqual(DEFAULT_SETTINGS);
  });

  it('handles storage failures gracefully without crashing the store', async () => {
    const failingAdapter: StorageAreaAdapter = {
      async get() {
        throw new Error('Quota or permission denied');
      },
      async set() {
        throw new Error('Storage write failed');
      },
      async remove() {
        throw new Error('Storage remove failed');
      },
    };

    setSettingsRepository(createSettingsRepository(failingAdapter));
    const store = useSettingsStore();

    await expect(store.initialize()).resolves.toBeUndefined();
    expect(store.loaded).toBe(true);
    expect(store.settings).toEqual(DEFAULT_SETTINGS);

    await expect(store.updateAppearance({ fontSize: 30 })).resolves.toBeUndefined();
    expect(store.settings.appearance.fontSize).toBe(30);
    expect(store.storageError).toContain('Storage write failed');
  });
});
