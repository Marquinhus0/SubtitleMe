# Testing Strategy

SubtitleMe uses **Vitest** for unit and integration tests and **Playwright** for end-to-end verification in a local HTML5 video test harness.

## Test Tiers

1. **Unit Tests (`tests/unit/`)**:
   - Sprint 01: Foundation checks (shared types, Manifest V3 schema & permissions, PNG icon integrity).
   - Sprint 02: Settings defaults/validation, persistence & storage failure resilience, `en`/`pt-BR` i18n parity, and Vue component/page rendering (`happy-dom`).
   - Sprint 03: Timestamp integer utilities (`timestamp.test.ts`), SRT & WebVTT parsers (`srt-parser.test.ts`, `vtt-parser.test.ts`), 18 deterministic fixtures under `tests/fixtures/{srt,vtt}/`, security payload stripping, format detection, and a 5,000-cue linear-time performance test.
   - Sprint 04: `subtitle-core.test.ts` (TrackManager, O(log n) CueIndex binary search on 10,000 cues, overlapping cues, boundary-union SubtitleMerger + SRT/VTT round-trip, PlayerSessionRegistry), `subtitle-sync.test.ts` (SyncEngine deduplication, rAF MediaSyncController play/pause/seek/rate/ended/multi-player isolation), `subtitle-renderer.test.ts` (Shadow DOM mount/cleanup, style updates, XSS `textContent` safety), and `tests/integration/dual-subtitle-engine.test.ts`.
   - Sprint 05: `encoding.test.ts` (UTF-8, BOM, Windows-1252 fallback), `indexeddb-repository.test.ts` (`fake-indexeddb` CRUD, unique `contentHash` duplicates, restart persistence, 3,000-cue benchmark, missing-IDB error), `subtitle-import.test.ts` (SRT/VTT validation, spoofed extensions, oversize rejection), and `tests/integration/local-files-persistence.test.ts` (File -> IndexedDB -> restart -> Pinia -> TrackManager -> Shadow DOM renderer).
   - Sprint 06: `tests/integration/player-integration.test.ts` (PlayerDetector ranking & debounced MutationObserver, NativeSubtitleObserver non-destructive mode restoration, Fullscreen OverlayManager re-parenting, multi-video PlayerLifecycleManager isolation & messaging validation).
   - Sprint 07: `tests/unit/qa-resilience.test.ts` (WCAG 2.2 AA contrast verification, hostile container Shadow DOM mount fallback, rapid fullscreen toggling, and 5-player zero-leak cleanup).
2. **Integration & Real Browser Tests (`tests/integration/`, `tests/e2e/`)**:
   - Controlled local HTML5 video harness: `tests/fixtures/html5-player.html` + legally self-generated 8 KB VP8 `tests/fixtures/sample-video.webm` + bilingual WebVTT tracks.
   - Real Chromium MV3 E2E suite (`pnpm test:browser` — `tests/e2e/chrome-extension.mjs`): runs in Google Chrome for Testing `159.0.8154.6` (`--headless=new --load-extension=apps/chrome-extension/dist`) verifying MV3 service worker boot, SRT & VTT local import preview/confirmation/duplicate/error handling, IndexedDB persistence across Popup reopen, `en`/`pt-BR` switching, keyboard Tab focus, real video playback, forward/backward seeking, `2x` playback speed, genuine `ended` clearing, dual native Shadow DOM rendering, 5-video scaling & cleanup, and `pagehide` `TextTrack.mode` restoration.

## Commands

```bash
pnpm test             # Run all Vitest unit + integration suites
pnpm test:unit        # Run unit tests only
pnpm test:integration # Run integration tests only
pnpm test:browser     # Run real Google Chrome MV3 extension integration harness
pnpm test:watch       # Watch mode
```
