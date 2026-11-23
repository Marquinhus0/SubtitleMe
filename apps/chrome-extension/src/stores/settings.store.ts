import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  cloneDefaultSettings,
  validateSettings,
  type GeneralSettings,
  type InterfaceLanguage,
  type SubtitleAppearanceSettings,
  type SubtitleMeSettings,
  type SubtitleSlot,
  type SubtitleSyncSettings,
} from '@subtitleme/shared-types';
import type { SettingsRepository } from '@subtitleme/subtitle-storage';
import {
  createExtensionSettingsRepository,
  subscribeSettingsChanges,
} from '../services/settings-storage';

let repository: SettingsRepository = createExtensionSettingsRepository();
let unsubscribeExternalChanges: (() => void) | null = null;

/**
 * Allows tests or alternate host environments to inject a custom SettingsRepository.
 */
export function setSettingsRepository(customRepository: SettingsRepository): void {
  repository = customRepository;
}

export function resetSettingsRepository(): void {
  repository = createExtensionSettingsRepository();
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SubtitleMeSettings>(cloneDefaultSettings());
  const loaded = ref(false);
  const saving = ref(false);
  const storageError = ref<string | null>(null);
  const lastValidationErrors = ref<string[]>([]);

  async function persistCurrent(): Promise<boolean> {
    const validation = validateSettings(settings.value);
    settings.value = validation.settings;
    lastValidationErrors.value = validation.errors;

    saving.value = true;
    try {
      const saved = await repository.save(validation.settings);
      settings.value = saved;
      storageError.value = null;
      return true;
    } catch (error) {
      storageError.value = error instanceof Error ? error.message : 'Storage persistence failed';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function initialize(): Promise<void> {
    try {
      const loadedSettings = await repository.load();
      settings.value = loadedSettings;
      storageError.value = null;
    } catch (error) {
      settings.value = cloneDefaultSettings();
      storageError.value = error instanceof Error ? error.message : 'Failed to load settings';
    } finally {
      loaded.value = true;
    }

    if (!unsubscribeExternalChanges) {
      unsubscribeExternalChanges = subscribeSettingsChanges((updated) => {
        settings.value = updated;
      });
    }
  }

  function applySettings(candidate: unknown): boolean {
    const result = validateSettings(candidate);
    settings.value = result.settings;
    lastValidationErrors.value = result.errors;
    void persistCurrent();
    return result.valid;
  }

  async function updateGeneral(patch: Partial<GeneralSettings>): Promise<void> {
    settings.value = {
      ...settings.value,
      general: {
        ...settings.value.general,
        ...patch,
      },
    };
    await persistCurrent();
  }

  async function updateAppearance(patch: Partial<SubtitleAppearanceSettings>): Promise<void> {
    settings.value = {
      ...settings.value,
      appearance: {
        ...settings.value.appearance,
        ...patch,
      },
    };
    await persistCurrent();
  }

  async function updateSync(patch: Partial<SubtitleSyncSettings>): Promise<void> {
    settings.value = {
      ...settings.value,
      sync: {
        ...settings.value.sync,
        ...patch,
      },
    };
    await persistCurrent();
  }

  async function setEnabled(enabled: boolean): Promise<void> {
    await updateGeneral({ enabled });
  }

  async function setUiLanguage(uiLanguage: InterfaceLanguage): Promise<void> {
    await updateGeneral({ uiLanguage });
  }

  async function setTrackEnabled(slot: SubtitleSlot, enabled: boolean): Promise<void> {
    if (slot === 'primary') {
      await updateGeneral({ primaryEnabled: enabled });
    } else {
      await updateGeneral({ secondaryEnabled: enabled });
    }
  }

  async function swapLanguages(): Promise<void> {
    const { defaultPrimaryLanguage, defaultSecondaryLanguage } = settings.value.general;
    await updateGeneral({
      defaultPrimaryLanguage: defaultSecondaryLanguage,
      defaultSecondaryLanguage: defaultPrimaryLanguage,
    });
  }

  async function adjustOffset(slot: SubtitleSlot, deltaMs: number): Promise<void> {
    if (slot === 'primary') {
      await updateSync({ primaryOffsetMs: settings.value.sync.primaryOffsetMs + deltaMs });
    } else {
      await updateSync({ secondaryOffsetMs: settings.value.sync.secondaryOffsetMs + deltaMs });
    }
  }

  async function resetOffset(slot: SubtitleSlot): Promise<void> {
    if (slot === 'primary') {
      await updateSync({ primaryOffsetMs: 0 });
    } else {
      await updateSync({ secondaryOffsetMs: 0 });
    }
  }

  async function resetAllOffsets(): Promise<void> {
    await updateSync({ primaryOffsetMs: 0, secondaryOffsetMs: 0 });
  }

  async function resetToDefaults(): Promise<void> {
    saving.value = true;
    try {
      settings.value = await repository.reset();
      storageError.value = null;
      lastValidationErrors.value = [];
    } catch (error) {
      settings.value = cloneDefaultSettings();
      storageError.value = error instanceof Error ? error.message : 'Failed to reset settings';
    } finally {
      saving.value = false;
    }
  }

  async function clearAllData(): Promise<void> {
    saving.value = true;
    try {
      await repository.clear();
      settings.value = cloneDefaultSettings();
      storageError.value = null;
      lastValidationErrors.value = [];
    } catch (error) {
      settings.value = cloneDefaultSettings();
      storageError.value = error instanceof Error ? error.message : 'Failed to clear settings';
    } finally {
      saving.value = false;
    }
  }

  return {
    settings,
    loaded,
    saving,
    storageError,
    lastValidationErrors,
    initialize,
    applySettings,
    updateGeneral,
    updateAppearance,
    updateSync,
    setEnabled,
    setUiLanguage,
    setTrackEnabled,
    swapLanguages,
    adjustOffset,
    resetOffset,
    resetAllOffsets,
    resetToDefaults,
    clearAllData,
  };
});
