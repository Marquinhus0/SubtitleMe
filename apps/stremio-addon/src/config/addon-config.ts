import type { SubtitleOrder } from '@subtitleme/shared-types';

export interface StremioLanguageDescriptor {
  /** BCP-47 tag used internally by SubtitleMe. */
  bcp47: string;
  /** ISO 639-2 three-letter code expected by Stremio Subtitles Object `lang`. */
  iso639_2: string;
  /** Human-readable display label (English). */
  label: string;
  /** Portuguese UI label for the Studio setup page. */
  labelPt?: string;
  /** Preferred Stremio subtitle menu & external addon language codes (ordered by priority). */
  stremioLangs?: readonly string[];
  /** OpenSubtitles REST API v1 language query code (defaults to lowercase `bcp47`). */
  openSubtitlesV1Code?: string;
}

export const STREMIO_SUPPORTED_LANGUAGES: readonly StremioLanguageDescriptor[] = [
  { bcp47: 'en', iso639_2: 'eng', label: 'English', labelPt: 'Inglês', stremioLangs: ['eng', 'en'] },
  {
    bcp47: 'pt-BR',
    iso639_2: 'por',
    label: 'Portuguese (Brazil)',
    labelPt: 'Português (Brasil)',
    stremioLangs: ['pob', 'pb', 'pt-br', 'pt_br', 'por', 'pt'],
    openSubtitlesV1Code: 'pt-br',
  },
  { bcp47: 'es', iso639_2: 'spa', label: 'Spanish', labelPt: 'Espanhol', stremioLangs: ['spa', 'spn', 'es', 'es-la'] },
  { bcp47: 'fr', iso639_2: 'fra', label: 'French', labelPt: 'Francês', stremioLangs: ['fre', 'fra', 'fr'] },
  { bcp47: 'de', iso639_2: 'deu', label: 'German', labelPt: 'Alemão', stremioLangs: ['ger', 'deu', 'de'] },
  { bcp47: 'it', iso639_2: 'ita', label: 'Italian', labelPt: 'Italiano', stremioLangs: ['ita', 'it'] },
  { bcp47: 'ja', iso639_2: 'jpn', label: 'Japanese', labelPt: 'Japonês', stremioLangs: ['jpn', 'ja'] },
  {
    bcp47: 'pt-PT',
    iso639_2: 'por',
    label: 'Portuguese (Portugal)',
    labelPt: 'Português (Portugal)',
    stremioLangs: ['por', 'pt', 'pt-pt'],
    openSubtitlesV1Code: 'pt-pt',
  },
  { bcp47: 'ru', iso639_2: 'rus', label: 'Russian', labelPt: 'Russo', stremioLangs: ['rus', 'ru'] },
  { bcp47: 'ko', iso639_2: 'kor', label: 'Korean', labelPt: 'Coreano', stremioLangs: ['kor', 'ko'] },
  {
    bcp47: 'zh',
    iso639_2: 'zho',
    label: 'Chinese',
    labelPt: 'Chinês',
    stremioLangs: ['chi', 'zho', 'zht', 'zh-cn', 'zh-tw', 'zh'],
    openSubtitlesV1Code: 'zh-cn',
  },
  { bcp47: 'ar', iso639_2: 'ara', label: 'Arabic', labelPt: 'Árabe', stremioLangs: ['ara', 'ar'] },
  { bcp47: 'tr', iso639_2: 'tur', label: 'Turkish', labelPt: 'Turco', stremioLangs: ['tur', 'tr'] },
  { bcp47: 'nl', iso639_2: 'nld', label: 'Dutch', labelPt: 'Holandês', stremioLangs: ['dut', 'nld', 'nl'] },
  { bcp47: 'pl', iso639_2: 'pol', label: 'Polish', labelPt: 'Polonês', stremioLangs: ['pol', 'pl'] },
  { bcp47: 'sv', iso639_2: 'swe', label: 'Swedish', labelPt: 'Sueco', stremioLangs: ['swe', 'sv'] },
  { bcp47: 'da', iso639_2: 'dan', label: 'Danish', labelPt: 'Dinamarquês', stremioLangs: ['dan', 'da'] },
  { bcp47: 'no', iso639_2: 'nor', label: 'Norwegian', labelPt: 'Norueguês', stremioLangs: ['nor', 'nob', 'no', 'nb'] },
  { bcp47: 'fi', iso639_2: 'fin', label: 'Finnish', labelPt: 'Finlandês', stremioLangs: ['fin', 'fi'] },
  { bcp47: 'el', iso639_2: 'ell', label: 'Greek', labelPt: 'Grego', stremioLangs: ['gre', 'ell', 'el'] },
  { bcp47: 'he', iso639_2: 'heb', label: 'Hebrew', labelPt: 'Hebraico', stremioLangs: ['heb', 'he'] },
  { bcp47: 'hu', iso639_2: 'hun', label: 'Hungarian', labelPt: 'Húngaro', stremioLangs: ['hun', 'hu'] },
  { bcp47: 'ro', iso639_2: 'ron', label: 'Romanian', labelPt: 'Romeno', stremioLangs: ['rum', 'ron', 'ro'] },
  { bcp47: 'cs', iso639_2: 'ces', label: 'Czech', labelPt: 'Tcheco', stremioLangs: ['cze', 'ces', 'cs'] },
  { bcp47: 'uk', iso639_2: 'ukr', label: 'Ukrainian', labelPt: 'Ucraniano', stremioLangs: ['ukr', 'uk'] },
  { bcp47: 'id', iso639_2: 'ind', label: 'Indonesian', labelPt: 'Indonésio', stremioLangs: ['ind', 'id'] },
  { bcp47: 'vi', iso639_2: 'vie', label: 'Vietnamese', labelPt: 'Vietnamita', stremioLangs: ['vie', 'vi'] },
  { bcp47: 'th', iso639_2: 'tha', label: 'Thai', labelPt: 'Tailandês', stremioLangs: ['tha', 'th'] },
  { bcp47: 'hi', iso639_2: 'hin', label: 'Hindi', labelPt: 'Hindi', stremioLangs: ['hin', 'hi'] },
  { bcp47: 'fa', iso639_2: 'fas', label: 'Persian', labelPt: 'Persa', stremioLangs: ['per', 'fas', 'fa'] },
  { bcp47: 'ur', iso639_2: 'urd', label: 'Urdu', labelPt: 'Urdu', stremioLangs: ['urd', 'ur'] },
  { bcp47: 'bg', iso639_2: 'bul', label: 'Bulgarian', labelPt: 'Búlgaro', stremioLangs: ['bul', 'bg'] },
  { bcp47: 'hr', iso639_2: 'hrv', label: 'Croatian', labelPt: 'Croata', stremioLangs: ['hrv', 'hr'] },
  { bcp47: 'sr', iso639_2: 'srp', label: 'Serbian', labelPt: 'Sérvio', stremioLangs: ['srp', 'sr'] },
  { bcp47: 'sk', iso639_2: 'slk', label: 'Slovak', labelPt: 'Eslovaco', stremioLangs: ['slo', 'slk', 'sk'] },
  { bcp47: 'sl', iso639_2: 'slv', label: 'Slovenian', labelPt: 'Esloveno', stremioLangs: ['slv', 'sl'] },
  { bcp47: 'ms', iso639_2: 'msa', label: 'Malay', labelPt: 'Malaio', stremioLangs: ['may', 'msa', 'ms'] },
];

export type SecondarySubtitleStyle = 'none' | 'italic' | 'brackets' | 'italic-brackets';
export type VerticalSubtitlePosition = 'bottom' | 'raised' | 'high' | 'top';
export type StremioOutputFormat = 'vtt' | 'srt' | 'ass';
export type SubtitleBackgroundStyle = 'outline' | 'box' | 'clean';
export type SubtitleSourcePreference = 'auto' | 'sync' | 'os';

export const ALLOWED_SUBTITLE_COLORS = [
  'none',
  '#FFFFFF',
  '#ECEBE8',
  '#34D399',
  '#10B981',
  '#FFD76A',
  '#FFD60A',
  '#9FD3FF',
  '#B9A3FF',
  '#36CFC9',
  '#CBD5E1',
  '#8B7CFF',
  '#73D13D',
  '#FFA940',
  '#FF85C0',
] as const;

export interface StremioAddonConfig {
  primaryLanguage: string;
  secondaryLanguage: string;
  primaryOffsetMs: number;
  secondaryOffsetMs: number;
  order: SubtitleOrder;
  bilingualEnabled: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  secondaryStyle?: SecondarySubtitleStyle;
  verticalPosition?: VerticalSubtitlePosition;
  fontSize?: number;
  backgroundStyle?: SubtitleBackgroundStyle;
  autoSync?: boolean;
  outputFormat?: StremioOutputFormat;
  /** DualSubs per-language source preference for primary (learning) track. */
  learnSrc?: SubtitleSourcePreference;
  /** DualSubs per-language source preference for secondary (native) track. */
  nativeSrc?: SubtitleSourcePreference;
  /** DualSubs number of ranked paired options shown in Stremio's subtitle picker (1..5). */
  pairCount?: number;
  /** DualSubs reveal delay (ms) — delays secondary line without shifting primary line position. */
  revealMs?: number;
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

export function getAcceptedStremioCodes(desc: StremioLanguageDescriptor): readonly string[] {
  if (desc.stremioLangs && desc.stremioLangs.length > 0) {
    return desc.stremioLangs;
  }
  return [desc.iso639_2.toLowerCase(), desc.bcp47.toLowerCase()];
}

export function getPrimaryStremioMenuLang(desc: StremioLanguageDescriptor): string {
  if (desc.bcp47 === 'pt-BR') return 'pob';
  return desc.stremioLangs?.[0] ?? desc.iso639_2;
}

export function findLanguageDescriptor(code: string): StremioLanguageDescriptor | undefined {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return undefined;
  const exact = STREMIO_SUPPORTED_LANGUAGES.find(
    (item) => item.bcp47.toLowerCase() === normalized || item.iso639_2.toLowerCase() === normalized,
  );
  if (exact) return exact;
  return STREMIO_SUPPORTED_LANGUAGES.find((item) =>
    item.stremioLangs?.some((alias) => alias.toLowerCase() === normalized),
  );
}
