import type { SubtitleOrder } from '@subtitleme/shared-types';
import {
  ALLOWED_SUBTITLE_COLORS,
  DEFAULT_ADDON_CONFIG,
  OFFSET_LIMIT_MS,
  findLanguageDescriptor,
  type SecondarySubtitleStyle,
  type StremioAddonConfig,
  type StremioOutputFormat,
  type SubtitleBackgroundStyle,
  type SubtitleSourcePreference,
  type VerticalSubtitlePosition,
} from './addon-config';

export interface ConfigValidationResult {
  valid: boolean;
  config: StremioAddonConfig;
  errors: string[];
}

const VALID_SECONDARY_STYLES = new Set<SecondarySubtitleStyle>([
  'none',
  'italic',
  'brackets',
  'italic-brackets',
]);

const VALID_VERTICAL_POSITIONS = new Set<VerticalSubtitlePosition>([
  'bottom',
  'raised',
  'high',
  'top',
]);

const VALID_BACKGROUND_STYLES = new Set<SubtitleBackgroundStyle>(['outline', 'box', 'clean']);
const VALID_SOURCE_PREFS = new Set<SubtitleSourcePreference>(['auto', 'sync', 'os']);

const ALLOWED_COLORS_UPPER = new Set<string>(
  ALLOWED_SUBTITLE_COLORS.map((c) => c.toUpperCase()),
);

function parseOffsetString(raw: string | undefined, field: string, errors: string[]): number {
  if (raw === undefined || raw.trim() === '') {
    return 0;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    errors.push(`${field} must be a finite integer in milliseconds.`);
    return 0;
  }
  const rounded = Math.round(parsed);
  if (rounded < -OFFSET_LIMIT_MS || rounded > OFFSET_LIMIT_MS) {
    errors.push(`${field} must be between -${OFFSET_LIMIT_MS} and ${OFFSET_LIMIT_MS} ms.`);
    return Math.max(-OFFSET_LIMIT_MS, Math.min(OFFSET_LIMIT_MS, rounded));
  }
  return rounded;
}

function parseColor(raw: string | undefined, field: string, errors: string[]): string {
  if (raw === undefined || raw.trim() === '' || raw.trim().toLowerCase() === 'none') {
    return 'none';
  }
  const upper = raw.trim().toUpperCase();
  if (ALLOWED_COLORS_UPPER.has(upper) || /^#[0-9A-F]{6}$/.test(upper)) {
    return upper;
  }
  errors.push(`Invalid ${field}: "${raw}". Expected "none" or a #RRGGBB hex color.`);
  return 'none';
}

function parseOptionalBoolean(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw.trim() === '') {
    return defaultValue;
  }
  const lower = raw.trim().toLowerCase();
  if (lower === 'on' || lower === 'true' || lower === 'checked' || lower === '1') {
    return true;
  }
  return false;
}

/**
 * Validates and normalizes Stremio `args.config` (where all values arrive as strings;
 * checkboxes arrive as `"on"` when enabled and are omitted when disabled).
 */
export function validateAddonConfig(
  rawConfig: Record<string, string> | undefined,
): ConfigValidationResult {
  const errors: string[] = [];

  if (!rawConfig || Object.keys(rawConfig).length === 0) {
    return {
      valid: true,
      config: { ...DEFAULT_ADDON_CONFIG },
      errors: [],
    };
  }

  const rawPrimary = rawConfig.primaryLanguage;
  const rawSecondary = rawConfig.secondaryLanguage;

  let primaryLanguage = DEFAULT_ADDON_CONFIG.primaryLanguage;
  if (rawPrimary !== undefined) {
    if (rawPrimary.trim() === '') {
      errors.push('primaryLanguage cannot be empty.');
    } else {
      const desc = findLanguageDescriptor(rawPrimary);
      if (!desc) {
        errors.push(`Unsupported primaryLanguage: "${rawPrimary}".`);
      } else {
        primaryLanguage = desc.bcp47;
      }
    }
  }

  let secondaryLanguage = DEFAULT_ADDON_CONFIG.secondaryLanguage;
  if (rawSecondary !== undefined) {
    if (rawSecondary.trim() === '') {
      errors.push('secondaryLanguage cannot be empty.');
    } else {
      const desc = findLanguageDescriptor(rawSecondary);
      if (!desc) {
        errors.push(`Unsupported secondaryLanguage: "${rawSecondary}".`);
      } else {
        secondaryLanguage = desc.bcp47;
      }
    }
  }

  if (primaryLanguage.toLowerCase() === secondaryLanguage.toLowerCase()) {
    errors.push('primaryLanguage and secondaryLanguage must be different.');
  }

  const primaryOffsetMs = parseOffsetString(rawConfig.primaryOffsetMs, 'primaryOffsetMs', errors);
  const secondaryOffsetMs = parseOffsetString(
    rawConfig.secondaryOffsetMs,
    'secondaryOffsetMs',
    errors,
  );

  let order: SubtitleOrder = DEFAULT_ADDON_CONFIG.order;
  if (rawConfig.order !== undefined && rawConfig.order.trim() !== '') {
    if (rawConfig.order === 'primary-top' || rawConfig.order === 'secondary-top') {
      order = rawConfig.order;
    } else {
      errors.push(`Invalid order: "${rawConfig.order}". Expected "primary-top" or "secondary-top".`);
    }
  } else if (rawConfig.top !== undefined && rawConfig.top.trim() !== '') {
    if (rawConfig.top === 'learn') order = 'primary-top';
    else if (rawConfig.top === 'native') order = 'secondary-top';
  }

  const rawEnabled = rawConfig.bilingualEnabled;
  let bilingualEnabled = DEFAULT_ADDON_CONFIG.bilingualEnabled;
  if (rawEnabled !== undefined) {
    const lower = rawEnabled.trim().toLowerCase();
    if (lower === 'on' || lower === 'true' || lower === 'checked' || lower === '1') {
      bilingualEnabled = true;
    } else if (lower === 'off' || lower === 'false' || lower === '0' || lower === '') {
      bilingualEnabled = false;
    } else {
      errors.push(`Invalid bilingualEnabled flag: "${rawEnabled}".`);
    }
  }

  const hasPrimaryColor = rawConfig.primaryColor !== undefined;
  const primaryColor = hasPrimaryColor
    ? parseColor(rawConfig.primaryColor, 'primaryColor', errors)
    : undefined;

  const hasSecondaryColor = rawConfig.secondaryColor !== undefined;
  const secondaryColor = hasSecondaryColor
    ? parseColor(rawConfig.secondaryColor, 'secondaryColor', errors)
    : undefined;

  let secondaryStyle: SecondarySubtitleStyle | undefined;
  if (rawConfig.secondaryStyle !== undefined && rawConfig.secondaryStyle.trim() !== '') {
    const candidate = rawConfig.secondaryStyle.trim() as SecondarySubtitleStyle;
    if (VALID_SECONDARY_STYLES.has(candidate)) {
      secondaryStyle = candidate;
    } else {
      errors.push(`Invalid secondaryStyle: "${rawConfig.secondaryStyle}".`);
    }
  }

  let verticalPosition: VerticalSubtitlePosition | undefined;
  if (rawConfig.verticalPosition !== undefined && rawConfig.verticalPosition.trim() !== '') {
    const candidate = rawConfig.verticalPosition.trim() as VerticalSubtitlePosition;
    if (VALID_VERTICAL_POSITIONS.has(candidate)) {
      verticalPosition = candidate;
    } else {
      errors.push(`Invalid verticalPosition: "${rawConfig.verticalPosition}".`);
    }
  }

  let outputFormat: StremioOutputFormat | undefined;
  if (rawConfig.outputFormat !== undefined && rawConfig.outputFormat.trim() !== '') {
    const lower = rawConfig.outputFormat.trim().toLowerCase();
    if (lower === 'vtt' || lower === 'srt' || lower === 'ass') {
      outputFormat = lower;
    } else {
      errors.push(`Invalid outputFormat: "${rawConfig.outputFormat}". Expected "vtt", "srt" or "ass".`);
    }
  }

  const autoSync =
    rawConfig.autoSync !== undefined ? parseOptionalBoolean(rawConfig.autoSync, false) : undefined;

  let fontSize: number | undefined;
  if (rawConfig.fontSize !== undefined && rawConfig.fontSize.trim() !== '') {
    const parsedSize = Number(rawConfig.fontSize);
    if (!Number.isFinite(parsedSize) || parsedSize < 24 || parsedSize > 80) {
      errors.push('fontSize must be between 24 and 80.');
    } else {
      fontSize = Math.round(parsedSize);
    }
  }

  let backgroundStyle: SubtitleBackgroundStyle | undefined;
  if (rawConfig.backgroundStyle !== undefined && rawConfig.backgroundStyle.trim() !== '') {
    const candidate = rawConfig.backgroundStyle.trim() as SubtitleBackgroundStyle;
    if (VALID_BACKGROUND_STYLES.has(candidate)) {
      backgroundStyle = candidate;
    } else {
      errors.push(`Invalid backgroundStyle: "${rawConfig.backgroundStyle}".`);
    }
  }

  let learnSrc: SubtitleSourcePreference | undefined;
  if (rawConfig.learnSrc !== undefined && rawConfig.learnSrc.trim() !== '') {
    const candidate = rawConfig.learnSrc.trim().toLowerCase() as SubtitleSourcePreference;
    if (VALID_SOURCE_PREFS.has(candidate)) {
      learnSrc = candidate;
    } else {
      errors.push(`Invalid learnSrc: "${rawConfig.learnSrc}". Expected "auto", "sync" or "os".`);
    }
  }

  let nativeSrc: SubtitleSourcePreference | undefined;
  if (rawConfig.nativeSrc !== undefined && rawConfig.nativeSrc.trim() !== '') {
    const candidate = rawConfig.nativeSrc.trim().toLowerCase() as SubtitleSourcePreference;
    if (VALID_SOURCE_PREFS.has(candidate)) {
      nativeSrc = candidate;
    } else {
      errors.push(`Invalid nativeSrc: "${rawConfig.nativeSrc}". Expected "auto", "sync" or "os".`);
    }
  }

  let pairCount: number | undefined;
  const rawPairCount = rawConfig.pairCount ?? rawConfig.count;
  if (rawPairCount !== undefined && rawPairCount.trim() !== '') {
    const parsedCount = Number(rawPairCount);
    if (!Number.isFinite(parsedCount) || parsedCount < 1 || parsedCount > 5) {
      errors.push('pairCount must be an integer between 1 and 5.');
    } else {
      pairCount = Math.round(parsedCount);
    }
  }

  let revealMs: number | undefined;
  const rawReveal = rawConfig.revealMs ?? rawConfig.reveal;
  if (rawReveal !== undefined && rawReveal.trim() !== '') {
    const parsedReveal = Number(rawReveal);
    if (!Number.isFinite(parsedReveal) || parsedReveal < 0 || parsedReveal > 5000) {
      errors.push('revealMs must be between 0 and 5000 ms.');
    } else {
      revealMs = Math.round(parsedReveal);
    }
  }

  return {
    valid: errors.length === 0,
    config: {
      primaryLanguage,
      secondaryLanguage,
      primaryOffsetMs,
      secondaryOffsetMs,
      order,
      bilingualEnabled,
      ...(primaryColor !== undefined ? { primaryColor } : {}),
      ...(secondaryColor !== undefined ? { secondaryColor } : {}),
      ...(secondaryStyle !== undefined ? { secondaryStyle } : {}),
      ...(verticalPosition !== undefined ? { verticalPosition } : {}),
      ...(fontSize !== undefined ? { fontSize } : {}),
      ...(backgroundStyle !== undefined ? { backgroundStyle } : {}),
      ...(autoSync !== undefined ? { autoSync } : {}),
      ...(outputFormat !== undefined ? { outputFormat } : {}),
      ...(learnSrc !== undefined ? { learnSrc } : {}),
      ...(nativeSrc !== undefined ? { nativeSrc } : {}),
      ...(pairCount !== undefined ? { pairCount } : {}),
      ...(revealMs !== undefined ? { revealMs } : {}),
    },
    errors,
  };
}
