import type { IncomingMessage, ServerResponse } from 'node:http';

export type StremioContentType = 'movie' | 'series' | 'channel' | 'tv';

export interface StremioManifestConfigField {
  key: string;
  type: 'text' | 'number' | 'password' | 'checkbox' | 'select';
  default?: string;
  title?: string;
  options?: string[];
  required?: boolean;
}

export interface StremioManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  resources: Array<
    | string
    | {
        name: string;
        types: StremioContentType[];
        idPrefixes?: string[];
      }
  >;
  types: StremioContentType[];
  catalogs: Array<{
    type: StremioContentType;
    id: string;
    name: string;
  }>;
  idPrefixes?: string[];
  behaviorHints?: {
    adult?: boolean;
    p2p?: boolean;
    configurable?: boolean;
    configurationRequired?: boolean;
  };
  config?: StremioManifestConfigField[];
}

export interface StremioSubtitlesExtra {
  videoHash?: string;
  videoSize?: number;
  filename?: string;
}

export interface StremioSubtitlesRequest {
  type: StremioContentType;
  id: string;
  extra?: StremioSubtitlesExtra;
  config?: Record<string, string>;
}

/**
 * Official Stremio Subtitle response object.
 * Reference: stremio-addon-sdk/docs/api/responses/subtitles.md
 */
export interface StremioSubtitleItem {
  id: string;
  url: string;
  /** ISO 639-2 three-letter language code (e.g. 'eng', 'por'). */
  lang: string;
  /** Optional human-readable label displayed in the Stremio subtitle picker. */
  label?: string;
}

export interface StremioSubtitlesResponse {
  subtitles: StremioSubtitleItem[];
  cacheMaxAge?: number;
  staleRevalidate?: number;
  staleError?: number;
}

export type StremioRouterMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => void;

export interface StremioAddonInterface {
  manifest: StremioManifest;
  get(
    resource: string,
    type: string,
    id: string,
    extra?: Record<string, unknown>,
    config?: Record<string, string>,
  ): Promise<unknown>;
}
