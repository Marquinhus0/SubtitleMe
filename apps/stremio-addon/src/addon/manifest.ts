import { DEFAULT_ADDON_CONFIG, STREMIO_SUPPORTED_LANGUAGES } from '../config/addon-config';
import type { StremioManifest } from '../types/stremio';

const LANGUAGE_OPTION_CODES = STREMIO_SUPPORTED_LANGUAGES.map((item) => item.bcp47);

/**
 * Official Stremio Addon Manifest for SubtitleMe MVP.
 * Declares only the `subtitles` resource with native Stremio `manifest.config`.
 */
export function createAddonManifest(): StremioManifest {
  return {
    id: 'com.subtitleme.addon',
    version: '1.0.0',
    name: 'SubtitleMe',
    description:
      'Two languages. One experience. Local-first Stremio addon combining dual-language subtitles into a single WebVTT track.',
    resources: ['subtitles'],
    types: ['movie', 'series'],
    catalogs: [],
    behaviorHints: {
      adult: false,
      p2p: false,
      configurable: true,
      configurationRequired: false,
    },
    config: [
      {
        key: 'primaryLanguage',
        type: 'select',
        title: 'Primary subtitle language',
        default: DEFAULT_ADDON_CONFIG.primaryLanguage,
        options: LANGUAGE_OPTION_CODES,
      },
      {
        key: 'secondaryLanguage',
        type: 'select',
        title: 'Secondary subtitle language',
        default: DEFAULT_ADDON_CONFIG.secondaryLanguage,
        options: LANGUAGE_OPTION_CODES,
      },
      {
        key: 'primaryOffsetMs',
        type: 'number',
        title: 'Primary timing offset (ms)',
        default: '0',
      },
      {
        key: 'secondaryOffsetMs',
        type: 'number',
        title: 'Secondary timing offset (ms)',
        default: '0',
      },
      {
        key: 'order',
        type: 'select',
        title: 'Subtitle stacking order',
        default: DEFAULT_ADDON_CONFIG.order,
        options: ['primary-top', 'secondary-top'],
      },
      {
        key: 'bilingualEnabled',
        type: 'checkbox',
        title: 'Enable combined bilingual subtitle',
        default: 'checked',
      },
    ],
  };
}
