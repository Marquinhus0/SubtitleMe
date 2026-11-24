# SubtitleMe — Subtitle Discovery & Sprint 15.3 Failure Audit (Fase 0)

## 1. Incident Summary (Sprint 15.3)

- **Tested Build**: `@subtitleme/stremio-addon@1.0.0-rc.2` (standalone archive outside monorepo)
- **Environment**: Windows 11 X64, Node.js `v24.19.0`, Stremio Desktop `5.0.28`
- **Observed Symptoms**:
  - Companion started cleanly on `127.0.0.1:7000` (`PID 25416`).
  - Addon installed cleanly in Stremio Desktop `5.0.28` via **Addons → + Add Addon**.
  - Earlier upload API calls returned `HTTP 201`.
  - During live playback in Stremio Desktop, **zero SubtitleMe tracks appeared in the player**.
  - Live diagnostics returned:
    - `GET /companion/health` → `{"ok":true,...,"registeredSubtitles":0}`
    - `GET /<config>/subtitles/movie/tt1254207.json` → `200 OK` with `{"subtitles":[]}`

---

## 2. Codebase Audit Findings (Root Causes)

Inspection of `manifest.ts`, `subtitles-handler.ts`, `server.ts`, `index.ts`, `companion-store.ts`, and `local-file-subtitle-source.ts` identified **four concrete architectural causes**:

### Root Cause 1 — Ephemeral Memory Default & Restart State Loss (`registeredSubtitles: 0`)
- `apps/stremio-addon/src/index.ts` launched `startStremioAddonServer()` with `persistenceOptions.enabled = false` unless `SUBTITLEME_PERSISTENCE=1` was explicitly set.
- Any subtitles uploaded in a prior process (or test session that restarted/cleaned up) vanished when the Companion restarted, leaving `CompanionSubtitleStore` empty (`registeredSubtitles: 0`) even though the user had already installed the addon in Stremio Desktop.

### Root Cause 2 — No Discovery Provider / External Fallback Wired at Runtime
- `startStremioAddonServer()` wired **only** `LocalFileSubtitleSource(companionStore)` as the default `sourceProvider`.
- `CompositeSubtitleSource` and `OpenSubtitlesSourceProvider` existed in `src/sources/` but were **never wired** into the runtime server or CLI startup.
- Consequently, playing any title in Stremio Desktop without manually uploading both `.srt`/`.vtt` tracks into `/configure` for that exact `contentId` in the current process always yielded `{"subtitles":[]}`.

### Root Cause 3 — Restrictive `idPrefixes: ['tt', 'sm_']` in Manifest
- `apps/stremio-addon/src/addon/manifest.ts` declared `idPrefixes: ['tt', 'sm_']`.
- Per the official Stremio protocol, `idPrefixes` instructs Stremio Desktop to **skip querying the addon altogether** for catalog items whose IDs do not start with `tt` or `sm_` (such as `tmdb:`, `kitsu:`, or custom/public-domain catalog IDs).

### Root Cause 4 — Unstructured Content Identification & Missing Matching Layer
- `subtitles-handler.ts` forwarded raw `args.id.trim()` directly to `fetchSubtitle()` without:
  - Decoding URL-encoded episode colons (`tt0903747%3A1%3A2` → `tt0903747:1:2`).
  - Structuring `movie` vs `series` (`season`, `episode`, `namespace`, `imdbId`).
  - Enforcing formal candidate discovery, confidence scoring, and strict content/episode matching before merging.

---

## 3. Remediation Scope (Sprint 15.4)

1. Introduce a dedicated **Stremio Content Identification** layer (`src/discovery/content-identifier.ts`) supporting movies, series episodes, IMDb IDs, and non-IMDb catalog IDs without filename guessing.
2. Introduce a clean **`SubtitleDiscoveryProvider`** + **`SubtitleMatcher`** + **`SubtitleDiscoveryOrchestrator`** architecture separating discovery, matching, authorized download, validation, parsing, merging, caching, and VTT delivery.
3. Preserve `LocalFileSubtitleSource` and wrap `CompanionSubtitleStore` in `LocalDiscoveryProvider` with normalized episode/movie matching and full persistence/invalidation support.
4. Upgrade `OpenSubtitlesDiscoveryProvider` (opt-in, disabled by default, official REST API v1, controlled retry, bounded download cache, zero scraping) and wire it optionally into `startStremioAddonServer()` and CLI startup.
5. Remove the restrictive `idPrefixes` filter from `manifest.ts` so Stremio queries SubtitleMe for all `movie` and `series` items while `ContentIdentifier` enforces strict matching.
