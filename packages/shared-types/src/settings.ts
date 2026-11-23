export type InterfaceLanguage = 'en' | 'pt-BR';

export type SubtitleOrder = 'primary-top' | 'secondary-top';

export type SubtitlePosition = 'bottom' | 'top';

export type SyncMode = 'raf' | 'timeupdate';

export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
}

export interface FontFamilyOption {
  id: string;
  label: string;
  stack: string;
}

export interface GeneralSettings {
  enabled: boolean;
  primaryEnabled: boolean;
  secondaryEnabled: boolean;
  uiLanguage: InterfaceLanguage;
  defaultPrimaryLanguage: string;
  defaultSecondaryLanguage: string;
  subtitleOrder: SubtitleOrder;
  rememberPreferences: boolean;
}

export interface SubtitleAppearanceSettings {
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  secondaryColor: string;
  backgroundOpacity: number;
  textOutline: boolean;
  textShadow: boolean;
  position: SubtitlePosition;
  lineSpacing: number;
}

export interface SubtitleSyncSettings {
  primaryOffsetMs: number;
  secondaryOffsetMs: number;
  syncMode: SyncMode;
}

export interface SubtitleShortcutSettings {
  toggleExtension: string;
  togglePrimary: string;
  toggleSecondary: string;
  increaseFontSize: string;
  decreaseFontSize: string;
  adjustSyncForward: string;
  adjustSyncBackward: string;
}

export interface SubtitleMeSettings {
  version: number;
  general: GeneralSettings;
  appearance: SubtitleAppearanceSettings;
  sync: SubtitleSyncSettings;
  shortcuts: SubtitleShortcutSettings;
}

export const SETTINGS_CONSTRAINTS = {
  fontSize: { min: 12, max: 48, step: 1 },
  backgroundOpacity: { min: 0, max: 1, step: 0.05 },
  lineSpacing: { min: 1.0, max: 2.2, step: 0.05 },
  offsetMs: { min: -30000, max: 30000, step: 100 },
} as const;

export const SUBTITLE_FONT_FAMILIES: readonly FontFamilyOption[] = [
  {
    id: 'inter',
    label: 'Inter (Default)',
    stack: 'Inter, system-ui, -apple-system, sans-serif',
  },
  {
    id: 'system-sans',
    label: 'System Sans',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: 'roboto',
    label: 'Roboto / Arial',
    stack: 'Roboto, Arial, Helvetica, sans-serif',
  },
  {
    id: 'georgia',
    label: 'Georgia Serif',
    stack: 'Georgia, "Times New Roman", serif',
  },
  {
    id: 'monospace',
    label: 'JetBrains Mono / Monospace',
    stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
];

export const SUBTITLE_LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', nativeLabel: 'Português (Brasil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)', nativeLabel: 'Português (Portugal)' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { code: 'zh-CN', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
];

export const DEFAULT_SETTINGS: SubtitleMeSettings = {
  version: 1,
  general: {
    enabled: true,
    primaryEnabled: true,
    secondaryEnabled: true,
    uiLanguage: 'en',
    defaultPrimaryLanguage: 'en',
    defaultSecondaryLanguage: 'pt-BR',
    subtitleOrder: 'primary-top',
    rememberPreferences: true,
  },
  appearance: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: 24,
    primaryColor: '#F4F5FA',
    secondaryColor: '#36CFC9',
    backgroundOpacity: 0.72,
    textOutline: true,
    textShadow: true,
    position: 'bottom',
    lineSpacing: 1.35,
  },
  sync: {
    primaryOffsetMs: 0,
    secondaryOffsetMs: 0,
    syncMode: 'raf',
  },
  shortcuts: {
    toggleExtension: 'Alt+Shift+S',
    togglePrimary: 'Alt+1',
    toggleSecondary: 'Alt+2',
    increaseFontSize: 'Alt+ArrowUp',
    decreaseFontSize: 'Alt+ArrowDown',
    adjustSyncForward: 'Alt+ArrowRight',
    adjustSyncBackward: 'Alt+ArrowLeft',
  },
};
