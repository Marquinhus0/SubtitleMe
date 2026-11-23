import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@subtitleme/shared-types';
import { SUPPORTED_SUBTITLE_FORMATS } from '@subtitleme/subtitle-parser';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');
const extensionPublicDir = resolve(repoRoot, 'apps/chrome-extension/public');

interface ManifestV3 {
  manifest_version: number;
  name: string;
  version: string;
  permissions?: string[];
  optional_host_permissions?: string[];
  icons?: Record<string, string>;
  action?: {
    default_popup?: string;
    default_icon?: Record<string, string>;
  };
  options_page?: string;
  background?: {
    service_worker?: string;
    type?: string;
  };
  content_security_policy?: {
    extension_pages?: string;
  };
}

describe('Sprint 01 Foundation', () => {
  it('provides valid default settings from @subtitleme/shared-types', () => {
    expect(DEFAULT_SETTINGS.version).toBe(1);
    expect(DEFAULT_SETTINGS.general.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.general.uiLanguage).toBe('en');
    expect(DEFAULT_SETTINGS.general.defaultPrimaryLanguage).toBe('en');
    expect(DEFAULT_SETTINGS.general.defaultSecondaryLanguage).toBe('pt-BR');
    expect(DEFAULT_SETTINGS.appearance.primaryColor).toBe('#F4F5FA');
    expect(DEFAULT_SETTINGS.appearance.secondaryColor).toBe('#36CFC9');
    expect(DEFAULT_SETTINGS.appearance.backgroundOpacity).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SETTINGS.appearance.backgroundOpacity).toBeLessThanOrEqual(1);
    expect(DEFAULT_SETTINGS.sync.primaryOffsetMs).toBe(0);
    expect(DEFAULT_SETTINGS.sync.secondaryOffsetMs).toBe(0);
    expect(DEFAULT_SETTINGS.sync.syncMode).toBe('raf');
  });

  it('declares SRT and WebVTT as v1.0 supported subtitle formats', () => {
    expect(SUPPORTED_SUBTITLE_FORMATS).toEqual(['srt', 'vtt']);
  });

  it('has a valid least-privilege Manifest V3 configuration', () => {
    const manifestPath = resolve(extensionPublicDir, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as ManifestV3;

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('SubtitleMe');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.action?.default_popup).toBe('popup/index.html');
    expect(manifest.options_page).toBe('options/index.html');
    expect(manifest.background?.service_worker).toBe('background/service-worker.js');
    expect(manifest.background?.type).toBe('module');

    // Enforce least-privilege: no broad permanent host_permissions or invasive APIs
    expect(manifest.permissions).toEqual(['storage', 'activeTab', 'scripting']);
    expect(manifest.permissions).not.toContain('tabs');
    expect(manifest.permissions).not.toContain('history');
    expect(manifest.permissions).not.toContain('cookies');
    expect(manifest.content_security_policy?.extension_pages).toBe(
      "script-src 'self'; object-src 'self'",
    );
  });

  it('ships valid PNG icons for all sizes referenced in manifest.json', () => {
    const manifestPath = resolve(extensionPublicDir, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as ManifestV3;
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    expect(manifest.icons).toBeDefined();
    for (const iconRelPath of Object.values(manifest.icons ?? {})) {
      const fullPath = resolve(extensionPublicDir, iconRelPath);
      expect(existsSync(fullPath)).toBe(true);
      const header = readFileSync(fullPath).subarray(0, 8);
      expect(header.equals(pngSignature)).toBe(true);
    }
  });
});
