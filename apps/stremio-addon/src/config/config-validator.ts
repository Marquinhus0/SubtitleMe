import type { SubtitleOrder } from '@subtitleme/shared-types';
import {
  ALLOWED_SUBTITLE_COLORS,
  DEFAULT_ADDON_CONFIG,
  OFFSET_LIMIT_MS,
  findLanguageDescriptor,
  type SecondarySubtitleStyle,
  type StremioAddonConfig,
  type StremioOutputFormat,
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
      ...(autoSync !== undefined ? { autoSync } : {}),
      ...(outputFormat !== undefined ? { outputFormat } : {}),
    },
    errors,
  };
}
