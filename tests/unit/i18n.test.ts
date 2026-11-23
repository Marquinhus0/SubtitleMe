import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  createMemoryStorageAdapter,
  createSettingsRepository,
} from '@subtitleme/subtitle-storage';
import { en } from '../../apps/chrome-extension/src/i18n/en';
import { ptBR } from '../../apps/chrome-extension/src/i18n/pt-BR';
import { translate, useI18n } from '../../apps/chrome-extension/src/i18n';
import {
  setSettingsRepository,
  useSettingsStore,
} from '../../apps/chrome-extension/src/stores/settings.store';

describe('Localization architecture (en / pt-BR)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setSettingsRepository(createSettingsRepository(createMemoryStorageAdapter()));
  });

  it('maintains 100% key parity between English and Brazilian Portuguese', () => {
    const enKeys = Object.keys(en).sort();
    const ptKeys = Object.keys(ptBR).sort();
    expect(ptKeys).toEqual(enKeys);

    for (const key of enKeys) {
      expect(ptBR[key as keyof typeof ptBR].trim().length).toBeGreaterThan(0);
    }
  });

  it('interpolates named parameters accurately in both locales', () => {
    expect(translate('en', 'app.version', { version: '1.0.0' })).toBe('Version 1.0.0');
    expect(translate('pt-BR', 'app.version', { version: '1.0.0' })).toBe('Versão 1.0.0');
  });

  it('updates useI18n() immediately when uiLanguage changes in the store', async () => {
    const settingsStore = useSettingsStore();
    const { locale, t } = useI18n();

    expect(locale.value).toBe('en');
    expect(t('settings.nav.appearance')).toBe('Appearance');

    await settingsStore.setUiLanguage('pt-BR');
    expect(locale.value).toBe('pt-BR');
    expect(t('settings.nav.appearance')).toBe('Aparência');
  });
});
