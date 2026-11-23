import {
  DEFAULT_SETTINGS,
  SETTINGS_CONSTRAINTS,
  type InterfaceLanguage,
  type SubtitleMeSettings,
  type SubtitleOrder,
  type SubtitlePosition,
  type SyncMode,
} from './settings';

export interface SettingsValidationResult {
  valid: boolean;
  settings: SubtitleMeSettings;
  errors: string[];
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LANGUAGE_TAG_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;
const VALID_UI_LANGUAGES = new Set<InterfaceLanguage>(['en', 'pt-BR']);
const VALID_ORDERS = new Set<SubtitleOrder>(['primary-top', 'secondary-top']);
const VALID_POSITIONS = new Set<SubtitlePosition>(['bottom', 'top']);
const VALID_SYNC_MODES = new Set<SyncMode>(['raf', 'timeupdate']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBoolean(
  record: Record<string, unknown>,
  key: string,
  fallback: boolean,
  path: string,
  errors: string[],
): boolean {
  const val = record[key];
  if (typeof val === 'boolean') {
    return val;
  }
  if (val !== undefined) {
    errors.push(`${path} must be a boolean`);
  }
  return fallback;
}

function readBoundedNumber(
  record: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
  path: string,
  errors: string[],
): number {
  const val = record[key];
  if (typeof val === 'number' && Number.isFinite(val)) {
    if (val < min || val > max) {
      errors.push(`${path} must be between ${min} and ${max}`);
      return Math.min(max, Math.max(min, val));
    }
    return val;
  }
  if (val !== undefined) {
    errors.push(`${path} must be a finite number`);
  }
  return fallback;
}

function readHexColor(
  record: Record<string, unknown>,
  key: string,
  fallback: string,
  path: string,
  errors: string[],
): string {
  const val = record[key];
  if (typeof val === 'string' && HEX_COLOR_PATTERN.test(val.trim())) {
    return val.trim().toUpperCase();
  }
  if (val !== undefined) {
    errors.push(`${path} must be a valid hex color`);
  }
  return fallback;
}

function readLanguageTag(
  record: Record<string, unknown>,
  key: string,
  fallback: string,
  path: string,
  errors: string[],
): string {
  const val = record[key];
  if (typeof val === 'string' && LANGUAGE_TAG_PATTERN.test(val.trim())) {
    return val.trim();
  }
  if (val !== undefined) {
    errors.push(`${path} must be a valid BCP-47 language code`);
  }
  return fallback;
}

function readNonEmptyString(
  record: Record<string, unknown>,
  key: string,
  fallback: string,
  path: string,
  errors: string[],
  maxLength = 120,
): string {
  const val = record[key];
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length > 0 && trimmed.length <= maxLength) {
      return trimmed;
    }
    errors.push(`${path} must be between 1 and ${maxLength} characters`);
    return fallback;
  }
  if (val !== undefined) {
    errors.push(`${path} must be a string`);
  }
  return fallback;
}

export function cloneDefaultSettings(): SubtitleMeSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

/**
 * Validates arbitrary unknown input against SubtitleMeSettings schema,
 * returning a safe normalized settings object along with any validation errors.
 */
export function validateSettings(input: unknown): SettingsValidationResult {
  const errors: string[] = [];
  const defaults = cloneDefaultSettings();

  if (!isRecord(input)) {
    return {
      valid: false,
      settings: defaults,
      errors: ['settings root must be an object'],
    };
  }

  const version =
    typeof input.version === 'number' && Number.isInteger(input.version) && input.version >= 1
      ? input.version
      : (input.version !== undefined && errors.push('version must be a positive integer'),
        defaults.version);

  const generalRaw = isRecord(input.general)
    ? input.general
    : (input.general !== undefined && errors.push('general must be an object'), {});

  const uiLanguageRaw = generalRaw.uiLanguage;
  let uiLanguage = defaults.general.uiLanguage;
  if (typeof uiLanguageRaw === 'string' && VALID_UI_LANGUAGES.has(uiLanguageRaw as InterfaceLanguage)) {
    uiLanguage = uiLanguageRaw as InterfaceLanguage;
  } else if (uiLanguageRaw !== undefined) {
    errors.push('general.uiLanguage must be "en" or "pt-BR"');
  }

  const orderRaw = generalRaw.subtitleOrder;
  let subtitleOrder = defaults.general.subtitleOrder;
  if (typeof orderRaw === 'string' && VALID_ORDERS.has(orderRaw as SubtitleOrder)) {
    subtitleOrder = orderRaw as SubtitleOrder;
  } else if (orderRaw !== undefined) {
    errors.push('general.subtitleOrder must be "primary-top" or "secondary-top"');
  }

  const appearanceRaw = isRecord(input.appearance)
    ? input.appearance
    : (input.appearance !== undefined && errors.push('appearance must be an object'), {});

  const posRaw = appearanceRaw.position;
  let position = defaults.appearance.position;
  if (typeof posRaw === 'string' && VALID_POSITIONS.has(posRaw as SubtitlePosition)) {
    position = posRaw as SubtitlePosition;
  } else if (posRaw !== undefined) {
    errors.push('appearance.position must be "bottom" or "top"');
  }

  const syncRaw = isRecord(input.sync)
    ? input.sync
    : (input.sync !== undefined && errors.push('sync must be an object'), {});

  const syncModeRaw = syncRaw.syncMode;
  let syncMode = defaults.sync.syncMode;
  if (typeof syncModeRaw === 'string' && VALID_SYNC_MODES.has(syncModeRaw as SyncMode)) {
    syncMode = syncModeRaw as SyncMode;
  } else if (syncModeRaw !== undefined) {
    errors.push('sync.syncMode must be "raf" or "timeupdate"');
  }

  const shortcutsRaw = isRecord(input.shortcuts)
    ? input.shortcuts
    : (input.shortcuts !== undefined && errors.push('shortcuts must be an object'), {});

  const settings: SubtitleMeSettings = {
    version,
    general: {
      enabled: readBoolean(generalRaw, 'enabled', defaults.general.enabled, 'general.enabled', errors),
      primaryEnabled: readBoolean(
        generalRaw,
        'primaryEnabled',
        defaults.general.primaryEnabled,
        'general.primaryEnabled',
        errors,
      ),
      secondaryEnabled: readBoolean(
        generalRaw,
        'secondaryEnabled',
        defaults.general.secondaryEnabled,
        'general.secondaryEnabled',
        errors,
      ),
      uiLanguage,
      defaultPrimaryLanguage: readLanguageTag(
        generalRaw,
        'defaultPrimaryLanguage',
        defaults.general.defaultPrimaryLanguage,
        'general.defaultPrimaryLanguage',
        errors,
      ),
      defaultSecondaryLanguage: readLanguageTag(
        generalRaw,
        'defaultSecondaryLanguage',
        defaults.general.defaultSecondaryLanguage,
        'general.defaultSecondaryLanguage',
        errors,
      ),
      subtitleOrder,
      rememberPreferences: readBoolean(
        generalRaw,
        'rememberPreferences',
        defaults.general.rememberPreferences,
        'general.rememberPreferences',
        errors,
      ),
    },
    appearance: {
      fontFamily: readNonEmptyString(
        appearanceRaw,
        'fontFamily',
        defaults.appearance.fontFamily,
        'appearance.fontFamily',
        errors,
        160,
      ),
      fontSize: Math.round(
        readBoundedNumber(
          appearanceRaw,
          'fontSize',
          defaults.appearance.fontSize,
          SETTINGS_CONSTRAINTS.fontSize.min,
          SETTINGS_CONSTRAINTS.fontSize.max,
          'appearance.fontSize',
          errors,
        ),
      ),
      primaryColor: readHexColor(
        appearanceRaw,
        'primaryColor',
        defaults.appearance.primaryColor,
        'appearance.primaryColor',
        errors,
      ),
      secondaryColor: readHexColor(
        appearanceRaw,
        'secondaryColor',
        defaults.appearance.secondaryColor,
        'appearance.secondaryColor',
        errors,
      ),
      backgroundOpacity: Number(
        readBoundedNumber(
          appearanceRaw,
          'backgroundOpacity',
          defaults.appearance.backgroundOpacity,
          SETTINGS_CONSTRAINTS.backgroundOpacity.min,
          SETTINGS_CONSTRAINTS.backgroundOpacity.max,
          'appearance.backgroundOpacity',
          errors,
        ).toFixed(2),
      ),
      textOutline: readBoolean(
        appearanceRaw,
        'textOutline',
        defaults.appearance.textOutline,
        'appearance.textOutline',
        errors,
      ),
      textShadow: readBoolean(
        appearanceRaw,
        'textShadow',
        defaults.appearance.textShadow,
        'appearance.textShadow',
        errors,
      ),
      position,
      lineSpacing: Number(
        readBoundedNumber(
          appearanceRaw,
          'lineSpacing',
          defaults.appearance.lineSpacing,
          SETTINGS_CONSTRAINTS.lineSpacing.min,
          SETTINGS_CONSTRAINTS.lineSpacing.max,
          'appearance.lineSpacing',
          errors,
        ).toFixed(2),
      ),
    },
    sync: {
      primaryOffsetMs: Math.round(
        readBoundedNumber(
          syncRaw,
          'primaryOffsetMs',
          defaults.sync.primaryOffsetMs,
          SETTINGS_CONSTRAINTS.offsetMs.min,
          SETTINGS_CONSTRAINTS.offsetMs.max,
          'sync.primaryOffsetMs',
          errors,
        ),
      ),
      secondaryOffsetMs: Math.round(
        readBoundedNumber(
          syncRaw,
          'secondaryOffsetMs',
          defaults.sync.secondaryOffsetMs,
          SETTINGS_CONSTRAINTS.offsetMs.min,
          SETTINGS_CONSTRAINTS.offsetMs.max,
          'sync.secondaryOffsetMs',
          errors,
        ),
      ),
      syncMode,
    },
    shortcuts: {
      toggleExtension: readNonEmptyString(
        shortcutsRaw,
        'toggleExtension',
        defaults.shortcuts.toggleExtension,
        'shortcuts.toggleExtension',
        errors,
        40,
      ),
      togglePrimary: readNonEmptyString(
        shortcutsRaw,
        'togglePrimary',
        defaults.shortcuts.togglePrimary,
        'shortcuts.togglePrimary',
        errors,
        40,
      ),
      toggleSecondary: readNonEmptyString(
        shortcutsRaw,
        'toggleSecondary',
        defaults.shortcuts.toggleSecondary,
        'shortcuts.toggleSecondary',
        errors,
        40,
      ),
      increaseFontSize: readNonEmptyString(
        shortcutsRaw,
        'increaseFontSize',
        defaults.shortcuts.increaseFontSize,
        'shortcuts.increaseFontSize',
        errors,
        40,
      ),
      decreaseFontSize: readNonEmptyString(
        shortcutsRaw,
        'decreaseFontSize',
        defaults.shortcuts.decreaseFontSize,
        'shortcuts.decreaseFontSize',
        errors,
        40,
      ),
      adjustSyncForward: readNonEmptyString(
        shortcutsRaw,
        'adjustSyncForward',
        defaults.shortcuts.adjustSyncForward,
        'shortcuts.adjustSyncForward',
        errors,
        40,
      ),
      adjustSyncBackward: readNonEmptyString(
        shortcutsRaw,
        'adjustSyncBackward',
        defaults.shortcuts.adjustSyncBackward,
        'shortcuts.adjustSyncBackward',
        errors,
        40,
      ),
    },
  };

  return {
    valid: errors.length === 0,
    settings,
    errors,
  };
}

export function sanitizeSettings(input: unknown): SubtitleMeSettings {
  return validateSettings(input).settings;
}
