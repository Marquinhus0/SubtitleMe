import type { SubtitleOrder } from '@subtitleme/shared-types';

export interface StremioLanguageDescriptor {
  /** BCP-47 tag used internally by SubtitleMe. */
  bcp47: string;
  /** ISO 639-2 three-letter code expected by Stremio Subtitles Object `lang`. */
  iso639_2: string;
  /** Human-readable display label. */
  label: string;
}

export const STREMIO_SUPPORTED_LANGUAGES: readonly StremioLanguageDescriptor[] = [
  { bcp47: 'en', iso639_2: 'eng', label: 'English' },
  { bcp47: 'pt-BR', iso639_2: 'por', label: 'Portuguese (Brazil)' },
  { bcp47: 'es', iso639_2: 'spa', label: 'Spanish' },
  { bcp47: 'fr', iso639_2: 'fra', label: 'French' },
  { bcp47: 'de', iso639_2: 'deu', label: 'German' },
  { bcp47: 'it', iso639_2: 'ita', label: 'Italian' },
  { bcp47: 'ja', iso639_2: 'jpn', label: 'Japanese' },
];

export interface StremioAddonConfig {
  primaryLanguage: string;
  secondaryLanguage: string;
  primaryOffsetMs: number;
  secondaryOffsetMs: number;
  order: SubtitleOrder;
  bilingualEnabled: boolean;
}

export const DEFAULT_ADDON_CONFIG: StremioAddonConfig = {
  primaryLanguage: 'en',
  secondaryLanguage: 'pt-BR',
  primaryOffsetMs: 0,
  secondaryOffsetMs: 0,
  order: 'primary-top',
  bilingualEnabled: true,
};

export const OFFSET_LIMIT_MS = 30_000;

export function findLanguageDescriptor(code: string): StremioLanguageDescriptor | undefined {
  const normalized = code.trim().toLowerCase();
  return STREMIO_SUPPORTED_LANGUAGES.find(
    (item) => item.bcp47.toLowerCase() === normalized || item.iso639_2.toLowerCase() === normalized,
  );
}
