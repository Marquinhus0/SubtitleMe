import type { SubtitleOrder } from '@subtitleme/shared-types';
import {
  DEFAULT_ADDON_CONFIG,
  OFFSET_LIMIT_MS,
  findLanguageDescriptor,
  type StremioAddonConfig,
} from './addon-config';

export interface ConfigValidationResult {
  valid: boolean;
  config: StremioAddonConfig;
  errors: string[];
}

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

  // Stremio checkboxes arrive as "on" (or "true") when checked; explicit "false"/"off" disables.
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

  return {
    valid: errors.length === 0,
    config: {
      primaryLanguage,
      secondaryLanguage,
      primaryOffsetMs,
      secondaryOffsetMs,
      order,
      bilingualEnabled,
    },
    errors,
  };
}
