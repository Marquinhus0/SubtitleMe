import { DEFAULT_ADDON_CONFIG, type StremioAddonConfig } from '../config/addon-config';
import { validateAddonConfig } from '../config/config-validator';

export interface StremioInstallUrls {
  readonly encodedConfig: string;
  readonly httpManifestUrl: string;
  readonly stremioDeepLink: string;
  readonly config: StremioAddonConfig;
}

/**
 * Serializes a validated SubtitleMe addon configuration into the JSON string format
 * expected by `stremio-addon-sdk` URL path segments (`/:config/manifest.json`).
 */
export function serializeStremioConfigForUrl(config: StremioAddonConfig): string {
  const payload: Record<string, string> = {
    primaryLanguage: config.primaryLanguage,
    secondaryLanguage: config.secondaryLanguage,
    primaryOffsetMs: String(config.primaryOffsetMs),
    secondaryOffsetMs: String(config.secondaryOffsetMs),
    order: config.order,
  };
  if (config.bilingualEnabled) {
    payload.bilingualEnabled = 'on';
  }
  if (config.primaryColor && config.primaryColor !== 'none') {
    payload.primaryColor = config.primaryColor;
  }
  if (config.secondaryColor && config.secondaryColor !== 'none') {
    payload.secondaryColor = config.secondaryColor;
  }
  if (config.secondaryStyle && config.secondaryStyle !== 'none') {
    payload.secondaryStyle = config.secondaryStyle;
  }
  if (config.verticalPosition && config.verticalPosition !== 'bottom') {
    payload.verticalPosition = config.verticalPosition;
  }
  if (config.autoSync) {
    payload.autoSync = 'on';
  }
  if (config.outputFormat && config.outputFormat !== 'vtt') {
    payload.outputFormat = config.outputFormat;
  }
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * Builds local Stremio installation URLs (`http://127.0.0.1:<port>/...` and `stremio://...`)
 * after validating the user's configuration.
 */
export function buildStremioInstallUrls(
  baseUrl: string,
  rawConfig: Record<string, unknown>,
): { ok: true; urls: StremioInstallUrls } | { ok: false; errors: string[] } {
  const stringConfig: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawConfig)) {
    if (typeof value === 'string') {
      stringConfig[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      stringConfig[key] = String(value);
    }
  }

  const validation = validateAddonConfig(stringConfig);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const encodedConfig = serializeStremioConfigForUrl(validation.config);
  const httpManifestUrl = `${normalizedBase}/${encodedConfig}/manifest.json`;
  const stremioDeepLink = httpManifestUrl.replace(/^https?:\/\//i, 'stremio://');

  return {
    ok: true,
    urls: {
      encodedConfig,
      httpManifestUrl,
      stremioDeepLink,
      config: validation.config,
    },
  };
}

export function getDefaultConfigureState(): StremioAddonConfig {
  return { ...DEFAULT_ADDON_CONFIG };
}
