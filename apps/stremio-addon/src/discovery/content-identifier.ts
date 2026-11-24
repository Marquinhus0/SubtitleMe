import type { StremioContentType } from '../types/stremio';

export type ContentIdNamespace = 'imdb' | 'tmdb' | 'kitsu' | 'custom';

export interface StremioContentIdentity {
  /** Original ID as received from the Stremio protocol (trimmed, URL-decoded safely). */
  readonly rawId: string;
  /** Canonical normalized lookup key (e.g., `tt1254207`, `tt0903747:1:2`, `tmdb:10378`). */
  readonly canonicalId: string;
  /** Media type declared by the Stremio request (`movie` or `series`). */
  readonly mediaType: StremioContentType;
  /** Detected ID namespace (never assumed to be IMDb unless genuinely `tt...`). */
  readonly namespace: ContentIdNamespace;
  /** IMDb identifier (`tt\d+`) ONLY when genuinely present in the Stremio ID. */
  readonly imdbId?: string;
  /** Positive 1-based season number for series episodes. */
  readonly season?: number;
  /** Positive 1-based episode number for series episodes. */
  readonly episode?: number;
  /** Auxiliary metadata provided by Stremio `extra` (NEVER used as sole match proof). */
  readonly videoHash?: string;
  readonly videoSize?: number;
  readonly filename?: string;
}

const IMDB_EPISODE_RE = /^(tt\d{5,12}):(\d{1,4}):(\d{1,4})$/i;
const IMDB_MOVIE_RE = /^(tt\d{5,12})$/i;
const TMDB_EPISODE_RE = /^tmdb:(\d{1,12}):(\d{1,4}):(\d{1,4})$/i;
const TMDB_MOVIE_RE = /^tmdb:(\d{1,12})$/i;
const KITSU_EPISODE_RE = /^kitsu:(\d{1,12}):(\d{1,4})$/i;
const KITSU_BASE_RE = /^kitsu:(\d{1,12})$/i;
const GENERIC_EPISODE_RE = /^([a-zA-Z0-9._-]{2,64}):(\d{1,4}):(\d{1,4})$/;

function safeDecodeId(raw: string): string {
  const trimmed = raw.trim();
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function parsePositiveInt(raw: string): number | undefined {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return undefined;
  return num;
}

/**
 * Parses a real Stremio protocol request (`type`, `id`, `extra`) into a structured
 * `StremioContentIdentity`.
 *
 * Guarantees:
 * - Preserves original IDs without assuming every Stremio catalog uses IMDb IDs.
 * - Properly distinguishes movies from series episodes (`season` + `episode`).
 * - Safely decodes URL-encoded colons (`tt0903747%3A1%3A2` -> `tt0903747:1:2`).
 * - Treats `filename` strictly as auxiliary metadata, never as content proof.
 */
export function parseStremioContentId(input: {
  type: StremioContentType;
  id: string;
  extra?: {
    videoHash?: string;
    videoSize?: number;
    filename?: string;
  };
}): StremioContentIdentity | null {
  if (!input || typeof input.id !== 'string') return null;
  const decoded = safeDecodeId(input.id);
  if (decoded.length === 0 || decoded.length > 128) return null;

  const extraFields = {
    ...(typeof input.extra?.videoHash === 'string' && input.extra.videoHash.trim().length > 0
      ? { videoHash: input.extra.videoHash.trim() }
      : {}),
    ...(typeof input.extra?.videoSize === 'number' && Number.isFinite(input.extra.videoSize)
      ? { videoSize: input.extra.videoSize }
      : {}),
    ...(typeof input.extra?.filename === 'string' && input.extra.filename.trim().length > 0
      ? { filename: input.extra.filename.trim() }
      : {}),
  };

  // 1. IMDb Episode: tt0903747:1:2
  const imdbEp = IMDB_EPISODE_RE.exec(decoded);
  if (imdbEp?.[1] && imdbEp[2] && imdbEp[3]) {
    const season = parsePositiveInt(imdbEp[2]);
    const episode = parsePositiveInt(imdbEp[3]);
    if (season === undefined || episode === undefined) return null;
    const imdbId = imdbEp[1].toLowerCase();
    return {
      rawId: decoded,
      canonicalId: `${imdbId}:${season}:${episode}`,
      mediaType: 'series',
      namespace: 'imdb',
      imdbId,
      season,
      episode,
      ...extraFields,
    };
  }

  // 2. IMDb Movie: tt1254207
  const imdbMovie = IMDB_MOVIE_RE.exec(decoded);
  if (imdbMovie?.[1]) {
    const imdbId = imdbMovie[1].toLowerCase();
    return {
      rawId: decoded,
      canonicalId: imdbId,
      mediaType: input.type,
      namespace: 'imdb',
      imdbId,
      ...extraFields,
    };
  }

  // 3. TMDB Episode / Movie
  const tmdbEp = TMDB_EPISODE_RE.exec(decoded);
  if (tmdbEp?.[1] && tmdbEp[2] && tmdbEp[3]) {
    const season = parsePositiveInt(tmdbEp[2]);
    const episode = parsePositiveInt(tmdbEp[3]);
    if (season === undefined || episode === undefined) return null;
    return {
      rawId: decoded,
      canonicalId: `tmdb:${tmdbEp[1]}:${season}:${episode}`,
      mediaType: 'series',
      namespace: 'tmdb',
      season,
      episode,
      ...extraFields,
    };
  }

  const tmdbMovie = TMDB_MOVIE_RE.exec(decoded);
  if (tmdbMovie?.[1]) {
    return {
      rawId: decoded,
      canonicalId: `tmdb:${tmdbMovie[1]}`,
      mediaType: input.type,
      namespace: 'tmdb',
      ...extraFields,
    };
  }

  // 4. Kitsu Episode / Base
  const kitsuEp = KITSU_EPISODE_RE.exec(decoded);
  if (kitsuEp?.[1] && kitsuEp[2]) {
    const episode = parsePositiveInt(kitsuEp[2]);
    if (episode === undefined) return null;
    return {
      rawId: decoded,
      canonicalId: `kitsu:${kitsuEp[1]}:${episode}`,
      mediaType: 'series',
      namespace: 'kitsu',
      season: 1,
      episode,
      ...extraFields,
    };
  }

  const kitsuBase = KITSU_BASE_RE.exec(decoded);
  if (kitsuBase?.[1]) {
    return {
      rawId: decoded,
      canonicalId: `kitsu:${kitsuBase[1]}`,
      mediaType: input.type,
      namespace: 'kitsu',
      ...extraFields,
    };
  }

  // 5. Generic custom episode: custom_show:1:2
  const genericEp = GENERIC_EPISODE_RE.exec(decoded);
  if (genericEp?.[1] && genericEp[2] && genericEp[3]) {
    const season = parsePositiveInt(genericEp[2]);
    const episode = parsePositiveInt(genericEp[3]);
    if (season === undefined || episode === undefined) return null;
    return {
      rawId: decoded,
      canonicalId: `${genericEp[1].toLowerCase()}:${season}:${episode}`,
      mediaType: 'series',
      namespace: 'custom',
      season,
      episode,
      ...extraFields,
    };
  }

  // 6. Custom catalog/user ID (never assumed to be IMDb)
  return {
    rawId: decoded,
    canonicalId: decoded.toLowerCase(),
    mediaType: input.type,
    namespace: 'custom',
    ...extraFields,
  };
}

/**
 * Explicit content matching check between a requested Stremio identity and a candidate.
 *
 * Rules:
 * - Never matches solely on filename.
 * - Never mixes a movie with a series episode.
 * - Never mixes different seasons or episodes of the same series.
 * - Requires exact canonicalId (or exact imdbId + identical season/episode for series).
 */
export function doesContentIdentityMatch(
  requested: StremioContentIdentity,
  candidate: {
    contentId: string;
    mediaType?: StremioContentType;
    season?: number;
    episode?: number;
  },
): boolean {
  const parsedCandidate = parseStremioContentId({
    type: candidate.mediaType ?? requested.mediaType,
    id: candidate.contentId,
  });
  if (!parsedCandidate) return false;

  const candidateSeason = candidate.season ?? parsedCandidate.season;
  const candidateEpisode = candidate.episode ?? parsedCandidate.episode;

  // If either side has episode coordinates, both MUST match season & episode exactly
  const requestedIsEpisode = requested.season !== undefined || requested.episode !== undefined;
  const candidateIsEpisode = candidateSeason !== undefined || candidateEpisode !== undefined;

  if (requestedIsEpisode !== candidateIsEpisode) {
    return false;
  }

  if (requestedIsEpisode) {
    if (requested.season !== candidateSeason || requested.episode !== candidateEpisode) {
      return false;
    }
  }

  // Canonical ID match (case-insensitive normalized)
  if (requested.canonicalId === parsedCandidate.canonicalId) {
    return true;
  }

  // IMDb ID match (with episode coordinates already verified equal above)
  if (
    requested.imdbId !== undefined &&
    parsedCandidate.imdbId !== undefined &&
    requested.imdbId === parsedCandidate.imdbId
  ) {
    return true;
  }

  return false;
}
