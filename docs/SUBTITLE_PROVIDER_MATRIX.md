# SubtitleMe — Subtitle Provider Matrix (Sprint 15.4)

| Provider | Origin | Default State | Supported IDs | Confidence | Privacy | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`LocalDiscoveryProvider`** (`CompanionSubtitleStore`) | `local` | **Enabled** | IMDb (`tt...`, `tt...:S:E`), TMDB, Kitsu, Custom | `exact` | **100% Local (`127.0.0.1`)** | **Tested** (Unit, HTTP E2E, Persistence) |
| **`OpenSubtitlesDiscoveryProvider`** (Official REST API v1) | `external` | **Disabled (Opt-in)** | IMDb (`tt...`, `tt...:S:E`) only | `exact` (hash) / `high` (IMDb) | Sends IMDb ID, language, optional hash when opted in; never uploads local files | **Partially Tested** (Mocked official API v1 contract; live key pending) |
| **`MockFixtureSubtitleSource`** | `local` (test fixture) | Test-only | Authorial PoC fixtures (`sm_poc_demo`, `tt1254207`) | — | 100% offline | **Tested** (Unit / PoC) |

## Priority Order

1. `local` (`LocalDiscoveryProvider`) — always selected first when matched; never overwritten by external providers.
2. `external` (`OpenSubtitlesDiscoveryProvider`, only when `OPENSUBTITLES_ENABLED=1` + valid `OPENSUBTITLES_API_KEY`) — fills missing primary or secondary track, or both tracks when no local files exist for an IMDb title.
