# SubtitleMe — Subtitle Discovery Architecture (Sprint 15.4)

## 1. Separated Pipeline Stages

Sprint 15.4 decouples subtitle resolution into 8 explicit, independently testable stages:

1. **Content Identification** (`src/discovery/content-identifier.ts`): Parses Stremio `{ type, id, extra }` into `StremioContentIdentity` (`rawId`, `canonicalId`, `mediaType`, `namespace`, `imdbId?`, `season?`, `episode?`).
2. **Discovery** (`SubtitleDiscoveryProvider`): Queries all registered providers (`LocalDiscoveryProvider`, optional opt-in `OpenSubtitlesDiscoveryProvider`) in parallel with `Promise.allSettled()` fault isolation.
3. **Matching & Selection** (`src/discovery/subtitle-matcher.ts`): Filters by exact content/episode match, BCP-47 language, confidence threshold (`exact`/`high`, rejecting `low`), and prioritizes `local` ahead of `external`.
4. **Authorized Download / Materialization** (`candidate.loadAsset()`): Only invokes download/read **after** both primary and secondary candidates pass matching.
5. **Validation & Parsing** (`@subtitleme/subtitle-parser`): Validates 5 MB cap and parses SRT/WebVTT into normalized cues.
6. **Merge & Sync** (`@subtitleme/subtitle-core`): Applies independent `primaryOffsetMs` / `secondaryOffsetMs` and stacking order (`primary-top` / `secondary-top`).
7. **Session-Scoped Cache** (`GeneratedSubtitleCache`): Stores combined WebVTT under a 192-bit opaque random token with 200-entry / 20 MB / 15-min TTL caps and source-ID invalidation.
8. **Stremio Protocol Delivery** (`subtitles-handler.ts` + `routes.ts`): Returns `{ subtitles: [{ id, url, lang, label }], cacheMaxAge }` and serves `GET /generated/:token.vtt` with `Content-Type: text/vtt; charset=utf-8` and CORS `*`.

---

## 2. Manifest & Protocol Alignment

- Removed restrictive `idPrefixes: ['tt', 'sm_']` from `manifest.ts` (`1.0.0-rc.3`) so Stremio Desktop queries SubtitleMe for all `movie` and `series` catalog items (`imdb`, `tmdb`, `kitsu`, `custom`), while `ContentIdentifier` enforces strict matching.
- Preserves all shared monorepo packages (`@subtitleme/shared-types`, `@subtitleme/subtitle-parser`, `@subtitleme/subtitle-core`) and Chrome Extension v1.0.0 RC completely untouched.
