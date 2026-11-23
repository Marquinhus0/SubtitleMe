import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_CONSTRAINTS,
  cloneDefaultSettings,
  sanitizeSettings,
  validateSettings,
} from '@subtitleme/shared-types';

describe('Settings defaults and validation', () => {
  it('validates DEFAULT_SETTINGS with zero errors', () => {
    const result = validateSettings(cloneDefaultSettings());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects non-object root inputs and falls back to defaults', () => {
    const nullResult = validateSettings(null);
    expect(nullResult.valid).toBe(false);
    expect(nullResult.errors.length).toBeGreaterThan(0);
    expect(nullResult.settings).toEqual(DEFAULT_SETTINGS);

    const arrayResult = validateSettings([]);
    expect(arrayResult.valid).toBe(false);
    expect(arrayResult.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps out-of-range numeric settings and reports errors', () => {
    const result = validateSettings({
      ...cloneDefaultSettings(),
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        fontSize: 120,
        backgroundOpacity: -0.5,
        lineSpacing: 5.0,
      },
      sync: {
        ...DEFAULT_SETTINGS.sync,
        primaryOffsetMs: 999999,
        secondaryOffsetMs: -999999,
      },
    });

    expect(result.valid).toBe(false);
    expect(result.settings.appearance.fontSize).toBe(SETTINGS_CONSTRAINTS.fontSize.max);
    expect(result.settings.appearance.backgroundOpacity).toBe(
      SETTINGS_CONSTRAINTS.backgroundOpacity.min,
    );
    expect(result.settings.appearance.lineSpacing).toBe(SETTINGS_CONSTRAINTS.lineSpacing.max);
    expect(result.settings.sync.primaryOffsetMs).toBe(SETTINGS_CONSTRAINTS.offsetMs.max);
    expect(result.settings.sync.secondaryOffsetMs).toBe(SETTINGS_CONSTRAINTS.offsetMs.min);
  });

  it('rejects invalid colors, languages, and enums while preserving valid fields', () => {
    const result = validateSettings({
      version: 1,
      general: {
        enabled: false,
        uiLanguage: 'de',
        defaultPrimaryLanguage: 'invalid language!!!',
        defaultSecondaryLanguage: 'es',
        subtitleOrder: 'side-by-side',
        rememberPreferences: false,
      },
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        primaryColor: 'not-a-color',
        secondaryColor: '#00ffaa',
        position: 'center',
      },
      sync: {
        primaryOffsetMs: 250,
        secondaryOffsetMs: -150,
        syncMode: 'poll',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
    // Valid fields preserved
    expect(result.settings.general.enabled).toBe(false);
    expect(result.settings.general.defaultSecondaryLanguage).toBe('es');
    expect(result.settings.appearance.secondaryColor).toBe('#00FFAA');
    expect(result.settings.sync.primaryOffsetMs).toBe(250);
    // Invalid fields fell back safely
    expect(result.settings.general.uiLanguage).toBe('en');
    expect(result.settings.general.defaultPrimaryLanguage).toBe('en');
    expect(result.settings.general.subtitleOrder).toBe('primary-top');
    expect(result.settings.appearance.primaryColor).toBe(DEFAULT_SETTINGS.appearance.primaryColor);
    expect(result.settings.appearance.position).toBe('bottom');
    expect(result.settings.sync.syncMode).toBe('raf');
  });

  it('sanitizeSettings returns a safe SubtitleMeSettings object for corrupted payloads', () => {
    const sanitized = sanitizeSettings({ appearance: { fontSize: 'huge' } });
    expect(sanitized.appearance.fontSize).toBe(DEFAULT_SETTINGS.appearance.fontSize);
    expect(sanitized.general.uiLanguage).toBe('en');
  });
});
