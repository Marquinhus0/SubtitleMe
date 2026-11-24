# SubtitleMe — Subtitle Discovery Test Report (Sprint 15.4)

## 1. Coverage of All 20 Required Scenarios (`apps/stremio-addon/tests/subtitle-discovery.test.ts`)

| # | Scenario | Result |
| :--- | :--- | :--- |
| 1 | Movie with two local sources (`tt1254207`) | **PASS** |
| 2 | Series episode with two local sources (`tt0903747:1:2` & URL-encoded `tt0903747%3A1%3A2`) | **PASS** |
| 3 | Movie with one local source + one external source (OpenSubtitles mock) | **PASS** |
| 4 | Content with two external sources (OpenSubtitles mock + 5xx retry + download cache) | **PASS** |
| 5 | Missing primary language | **PASS** (returns `[]`) |
| 6 | Missing secondary language | **PASS** (returns `[]`) |
| 7 | Incompatible ID (`tmdb:999999`) | **PASS** (returns `[]`) |
| 8 | Wrong episode (`tt0903747:1:3` vs `tt0903747:1:2`) | **PASS** (returns `[]`) |
| 9 | Provider unavailable (throwing provider isolated from local discovery) | **PASS** |
| 10 | Invalid OpenSubtitles API key (`HTTP 401`) | **PASS** (`AUTH_ERROR`) |
| 11 | Rate limit (`HTTP 429` + `Retry-After`) | **PASS** (`RATE_LIMITED`) |
| 12 | Timeout (`AbortError`) | **PASS** (`TIMEOUT`) |
| 13 | Content with no match | **PASS** (returns `[]`) |
| 14 | Cache hit & expiration | **PASS** |
| 15 | Source deletion & immediate derived VTT invalidation (`404`) | **PASS** |
| 16 | Companion restart recovery | **PASS** |
| 17 | Persistence disabled (memory-only, zero disk writes) | **PASS** |
| 18 | Persistence enabled (disk recovery after restart) | **PASS** |
| 19 | Concurrent multi-session isolation (`session-alpha` vs `session-beta`) | **PASS** |
| 20 | Full Stremio protocol HTTP E2E (`/manifest.json`, `/subtitles/series/tt0903747%3A1%3A2.json`, `/generated/:token.vtt` with `text/vtt` & CORS `*`) | **PASS** |

## 2. Boundary Notice

All 20 scenarios above validate **protocol, discovery, matching, merge, caching, persistence, and HTTP delivery**. Visual dual-subtitle rendering inside Stremio Desktop `5.0.28` still requires a fresh human visual run using `1.0.0-rc.3`.
