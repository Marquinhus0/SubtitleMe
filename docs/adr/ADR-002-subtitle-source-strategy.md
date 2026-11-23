# ADR-002: Pluggable `SubtitleSourceProvider` Architecture for Stremio Subtitle Acquisition

- **Status**: Accepted (Sprint 09)
- **Context**: Stremio does not pass source subtitle files to a subtitles addon—only `type`, `id` (e.g., IMDB ID), optional `extra` (`videoHash`, `videoSize`, `filename`), and `config`. Furthermore, Chrome extension storage (`IndexedDB` / `chrome.storage.local`) is sandboxed and inaccessible to Stremio.
- **Decision**: Define an abstract `SubtitleSourceProvider` interface (`fetchSubtitle(query)`) decoupling the addon from how source tracks are obtained:
  - **Sprint 09 (PoC)**: Use exclusively `MockFixtureSubtitleSource` (authorial SRT/VTT fixtures) to validate the protocol and merge pipeline without fabricating external integrations.
  - **Sprint 10 (MVP)**: Implement a local-first companion provider (allowing users to supply two local `.srt`/`.vtt` files via a local UI with 100% privacy) plus an opt-in authorized external API provider (e.g., official OpenSubtitles REST API v1 with user API key and ToS compliance).
- **Alternatives Discarded**:
  - *Unauthorized scraping of subtitle websites*: Rejected on legal, ethical, and reliability grounds.
  - *Reading Chrome Extension IndexedDB*: Technically impossible due to browser sandbox boundaries.
  - *Hardcoding a single external provider*: Creates vendor lock-in and quota bottlenecks.
- **Consequences**: Clean SOLID separation, zero unauthorized data access, and full testability without network dependencies.
