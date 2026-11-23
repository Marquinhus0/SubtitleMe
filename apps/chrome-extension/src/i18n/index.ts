import { computed } from 'vue';
import type { InterfaceLanguage } from '@subtitleme/shared-types';
import { useSettingsStore } from '../stores/settings.store';
import { en, type TranslationKey } from './en';
import { ptBR } from './pt-BR';

const DICTIONARIES: Record<InterfaceLanguage, Record<TranslationKey, string>> = {
  en,
  'pt-BR': ptBR,
};

export type { TranslationKey };

export function translate(
  locale: InterfaceLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES.en;
  let text = dictionary[key] ?? DICTIONARIES.en[key] ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replaceAll(`{${paramKey}}`, String(paramValue));
    }
  }

  return text;
}

export function useI18n() {
  const settingsStore = useSettingsStore();
  const locale = computed<InterfaceLanguage>(() => settingsStore.settings.general.uiLanguage);

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    return translate(locale.value, key, params);
  }

  return {
    locale,
    t,
  };
}
