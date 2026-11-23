# SubtitleMe — External Validation Plan & Closure Guide (Sprint 13)

## 1. Purpose

This document tracks the three external validation tracks that require resources outside the headless Linux CI/VM environment before promoting `@subtitleme/stremio-addon` from **`1.0.0-rc.1`** to final GA (`1.0.0`):

| External Track | Current Status | Blocker in Headless Linux VM | Validation Guide |
| :--- | :--- | :--- | :--- |
| **1. Stremio Desktop Visual Player** | **Partially Tested** | No graphical Stremio Desktop binary (`stremio=none`) | [STREMIO_DESKTOP_VALIDATION.md](./STREMIO_DESKTOP_VALIDATION.md) & `docs/validation/stremio-desktop/` |
| **2. Native Windows Execution** | **Not Evaluated** | No native Windows host | [STREMIO_WINDOWS_VALIDATION.md](./STREMIO_WINDOWS_VALIDATION.md) |
| **3. OpenSubtitles REST API v1 Live** | **Partially Tested** | No authorized `OPENSUBTITLES_API_KEY` (`os_key=none`) | Section 2 below |

---

## 2. OpenSubtitles Live Controlled Validation Procedure

When an authorized user-supplied `OPENSUBTITLES_API_KEY` is available on a local machine:

1. Never commit the API key to git or write it to log files.
2. Export it ephemerally in your shell: `export OPENSUBTITLES_API_KEY="<your-key>"`.
3. Instantiate `OpenSubtitlesSourceProvider({ enabled: true, apiKey: process.env.OPENSUBTITLES_API_KEY })` with `CompositeSubtitleSource({ localProvider, externalProvider, externalFallbackEnabled: true })`.
4. Verify:
   - Valid `Api-Key` returns search + download (`200 OK`) for an IMDb ID (e.g., `tt1254207`).
   - Invalid `Api-Key` returns `AUTH_ERROR` (`401`) cleanly without crashing.
   - Rate-limit responses (`429`) populate `retryAfterSeconds`.
   - Local track is **never** overwritten when present; external track is fetched only for the missing language.
   - Zero local `.srt`/`.vtt` files are ever uploaded to OpenSubtitles.
