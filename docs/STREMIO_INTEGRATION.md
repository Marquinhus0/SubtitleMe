# SubtitleMe — Stremio Integration & Subtitle Source Strategy

## 1. Subtitle Source Strategy Comparison

| Strategy | Privacy | Technical Feasibility | Legal / ToS | Sprint 10 Status |
| :--- | :--- | :--- | :--- | :--- |
| **Chrome Extension IndexedDB direct read** | High | **Infeasible** (browser origin sandbox blocks Stremio) | Compliant | Rejected (Chrome & Stremio remain independent) |
| **Local Companion (`LocalFileSubtitleSource`)** | **Maximum (100% local on `127.0.0.1`)** | High | Full | **Implemented (MVP Primary Source)** |
| **OpenSubtitles REST API v1 (`OpenSubtitlesSourceProvider`)** | Medium (sends IMDb ID / language when opted in) | High | Compliant (official API, user `Api-Key`, zero scraping) | **Implemented as Opt-In Contract (Mock-Tested)** |
| **Web Scraping** | Low | Fragile | **Unacceptable** | Permanently Rejected |

---

## 2. Explicit Content Association Strategy

`LocalFileSubtitleSource` NEVER relies solely on filenames to match subtitles across videos:

1. **Primary match**: Exact normalized Stremio/IMDb Content ID (e.g., `tt1254207` for movies, `tt0903747:1:1` for series episodes).
2. **Secondary match**: Explicit user-defined identifier (`contentId`, alphanumeric plus `.`, `_`, `:`, `-`).
3. **Filename role**: Auxiliary display metadata only (sanitized basename, never opened from disk, never used as proof of content identity).
4. **Isolation guarantee**: Subtitles registered for `tt1111111` will never be returned for `tt9999999`, even if both share an identical filename.

---

## 3. Source Selection & Fallback Policy (`CompositeSubtitleSource`)

1. **Local First**: Always queries `LocalFileSubtitleSource` for both primary and secondary languages.
2. **No Silent Overwrite**: If a local track exists for `(videoId, language)`, it is always used and never silently replaced by an external source.
3. **Opt-In External Fallback**: Only when a local track is missing AND `externalFallbackEnabled === true` AND an external provider is configured does SubtitleMe query `OpenSubtitlesSourceProvider` for that exact `videoId` and `language`.
4. **Controlled Completeness**: If either language remains unavailable after resolution, the handler returns `{ subtitles: [] }` instead of combining mismatched content.

---

## 4. OpenSubtitles REST API v1 (Opt-In Contract)

Implemented in `apps/stremio-addon/src/sources/opensubtitles-source.ts`:

- **Disabled by default** (`enabled: false`): Zero outbound network requests unless explicitly enabled by the user.
- **Official endpoints**: `GET https://api.opensubtitles.com/api/v1/subtitles` and `POST https://api.opensubtitles.com/api/v1/download` with `Api-Key` and `User-Agent` headers.
- **Error resilience**: Handles HTTP `401`/`403` (`AUTH_ERROR`), `429` (`RATE_LIMITED` + `Retry-After`), `AbortController` timeouts (`TIMEOUT`), empty search lists (`NOT_FOUND`), malformed JSON (`MALFORMED_RESPONSE`), and files > 5 MB (`TOO_LARGE`).
- **Verification note**: Because no user OpenSubtitles API key is provisioned in this environment, the provider was verified exclusively with deterministic mocked HTTP responses (not live network calls).
