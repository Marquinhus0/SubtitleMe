# SubtitleMe — OpenSubtitles REST API v1 Integration (Sprint 15.4)

## 1. Policy & Activation

- **Default State**: **DISABLED** (`enabled: false`). Zero external requests are made unless explicitly enabled by the user.
- **CLI Opt-In Activation**:
  ```bash
  OPENSUBTITLES_ENABLED=1 OPENSUBTITLES_API_KEY="<your-key>" ./apps/stremio-addon/bin/start-companion.sh
  ```
- **Zero Scraping**: Uses exclusively the official documented OpenSubtitles REST API v1 (`GET https://api.opensubtitles.com/api/v1/subtitles`, `POST https://api.opensubtitles.com/api/v1/download`) with `Api-Key` and `User-Agent` headers.

---

## 2. Reliability, Security & Quota Controls (`OpenSubtitlesDiscoveryProvider`)

- **Credential Hygiene**: `OPENSUBTITLES_API_KEY` and optional `OPENSUBTITLES_BEARER_TOKEN` are never printed to stdout/stderr, never stored in `SubtitleDiscoveryCandidate`, and never persisted to disk.
- **Controlled Retry**: Retries transient `5xx` responses at most once (`maxRetries: 1`) with bounded backoff; **never** retries `401`/`403` authentication errors or `429` rate-limit responses.
- **Rate Limit & Timeout Handling**: Captures `Retry-After` on `429`, aborts hung requests via `AbortController` (`8000 ms` default), and degrades cleanly to `[]` / `null` without breaking local discovery.
- **Bounded Download Cache**: Caches downloaded external assets in memory (default 100 entries, 15-min TTL) so repeated Stremio queries do not burn download quota.
- **IMDb ID Requirement**: Only queries OpenSubtitles when `identity.imdbId` is genuinely present (plus `season_number` and `episode_number` for series episodes); never guesses IDs for non-IMDb catalogs.

---

## 3. Live Validation Status

- **Current Status**: **`Partially Tested` (Mocked Contract Only)** — no live `OPENSUBTITLES_API_KEY` is provisioned in this environment. Do not declare live OpenSubtitles operational support until executed with an authorized user key.
