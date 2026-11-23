# Changelog

All notable changes to SubtitleMe will be documented in this file.

## [1.0.0-rc] — 2026-11-23

### Sprint 08 — Release Candidate & Production Packaging
- Finalized Manifest V3 (`apps/chrome-extension/public/manifest.json`) with audited least-privilege permissions and consistent `1.0.0` metadata.
- Generated final 4×4 supersampled anti-aliased PNG icons (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`) aligned with `BrandLogo.vue`.
- Created reproducible release packaging pipeline (`scripts/package-release.mjs` / `pnpm package:release`) generating bit-for-bit identical `dist/release/subtitleme-chrome-v1.0.0.zip` and `dist/release/SHA256SUMS.txt`.
- Added extracted-ZIP installation verification in real Chromium (`pnpm test:release`) asserting zero uncaught page errors.
- Authored `docs/INSTALLATION.md`, `docs/STORE_LISTING.md` (`en` & `pt-BR`), `docs/RELEASE_NOTES.md`, and `docs/RELEASE_CHECKLIST.md`.

### Sprint 07 — Quality Assurance, Security & Performance
- Fixed critical Vue 3 reactive Proxy `DataCloneError` in `buildLocalSubtitleRecord()` discovered during real Chromium E2E IndexedDB import testing.
- Fixed WCAG 2.2 AA muted text contrast (`--sm-text-muted` raised from `#6C7385` to `#8991A5`, achieving `>= 4.97:1` on all dark surfaces) and added 200% zoom responsive width bounds to `popup/App.vue`.
- Hardened `OverlayManager.reconcileMountContainer()` with safe fallback to `document.body` on hostile container attachment failures.
- Expanded real Chromium MV3 E2E suite (`tests/e2e/chrome-extension.mjs`) with legally generated `sample-video.webm`, covering real playback, forward/backward seeking, `2x` speed, genuine `ended` clearing, SRT/VTT import + duplicate/invalid rejection, IndexedDB persistence across Popup reopen, 5-video scaling/cleanup, and `TextTrack.mode` restoration.
- Added `tests/unit/qa-resilience.test.ts` and formal audit reports: `docs/SECURITY_AUDIT.md`, `docs/ACCESSIBILITY_AUDIT.md`, and `docs/PERFORMANCE_AUDIT.md`.

### Sprint 06 — Browser & Player Integration
- Implemented `PlayerDetector` with debounced `MutationObserver` and candidate ranking (fullscreen, playback, visibility, dimensions, interaction, viewport) in `apps/chrome-extension/src/content/player-detector.ts`.
- Implemented `NativeSubtitleObserver` and `convertNativeTrackToSubtitleTrack()` with safe text normalization and non-destructive `TextTrack.mode` preservation & restoration.
- Upgraded `OverlayManager` with fullscreen subtree re-parenting, exit restoration, and non-destructive container positioning.
- Implemented `PlayerLifecycleManager` coordinating isolated multi-video sessions (`PlayerSessionRegistry`, `TrackManager`, `MediaSyncController`, `OverlayManager`, `NativeSubtitleObserver`) and idempotent content-script bootstrapping (`content/index.ts`).
- Implemented strongly typed, `requestId`-tracked Popup-to-Content-Script messaging (`messages.ts`, `tab-messaging.ts`) with `activeTab` + `chrome.scripting` on-demand injection and restricted-page handling.
- Upgraded `VideoStatus.vue` and `popup/App.vue` with live playing/paused/fullscreen/native/local status badges and real-time local track push.
- Added controlled HTML5 test page (`tests/fixtures/html5-player.html`), `tests/integration/player-integration.test.ts`, and real Google Chrome MV3 Playwright harness (`tests/e2e/chrome-extension.mjs`).

### Sprint 05 — Local Files & Persistence
- Implemented versioned IndexedDB `LocalSubtitleRepository` (`subtitleme-local-subtitles` v1) with CRUD, unique `contentHash` duplicate prevention, storage usage reporting, typed `SubtitleStorageError` handling, and in-memory fallback in `@subtitleme/subtitle-storage`.
- Added encoding detection & normalization (`decodeSubtitleBytes`) in `@subtitleme/subtitle-parser` supporting UTF-8, UTF-8/UTF-16 BOM, and Windows-1252 fallback with user warnings.
- Implemented validated import pipeline (`subtitle-import.ts`) with oversize-before-read rejection, content format verification, preview generation, and explicit user confirmation in `FileImporter.vue`.
- Connected `subtitle.store.ts`, Popup, and Settings Local Files section to IndexedDB persistence and `TrackManager` (`track-bridge.ts`) with separated persistent/runtime track identity, inline cue preview, language assignment, and confirmed deletion controls.
- Added unit and integration tests using `fake-indexeddb` covering repository CRUD, restart persistence, encoding fallback, import validation, and end-to-end rendering.

### Sprint 04 — Dual Subtitle Engine
- Implemented `CueIndex` (O(log n) binary search with prefix-max pruning for overlapping cues and `[start, end)` half-open interval policy) and `TrackManager` in `@subtitleme/subtitle-core`.
- Implemented boundary-union `SubtitleMerger` and `serializeSubtitleCues()` (SRT/VTT) in `@subtitleme/subtitle-core` to support future Stremio Addon integration.
- Added `PlayerSessionRegistry` for isolated multi-player lifecycle management.
- Implemented browser-independent `SyncEngine` and isolated `requestAnimationFrame` `MediaSyncController` in `@subtitleme/subtitle-sync` with pause/resume/seek/playbackRate/ended handling and update deduplication.
- Implemented `createShadowSubtitleRenderer()` in `@subtitleme/subtitle-renderer` with Shadow DOM style isolation, safe `textContent` rendering, node/style caching, resize/fullscreen handling, and connected `OverlayManager` in the content script.
- Added unit and integration tests for core, sync, renderer, and full dual-subtitle pipeline.

### Sprint 03 — Subtitle Parsing
- Implemented complete browser-independent SubRip (`.srt`) and WebVTT (`.vtt`) parsing engine in `@subtitleme/subtitle-parser`.
- Added integer-millisecond timestamp utilities (`parseSrtTimestamp`, `parseVttTimestamp`, `normalizeTimestamp`, `formatTimestamp`) with strict bounds validation and zero-duration policy.
- Added safe text normalizer handling UTF-8 BOM, LF/CRLF/CR line endings, formatting tag stripping, `<script>`/`<style>` payload removal, HTML entity decoding, and Unicode preservation.
- Added structured diagnostics (`SubtitleDiagnosticCode`, severity, line/cue index), cue validation preserving valid overlaps, and automatic format detection via `parseSubtitle()`.
- Added 18 deterministic SRT/VTT test fixtures under `tests/fixtures/` and comprehensive unit + 5,000-cue performance tests.

### Sprint 02 — Design System
- Established Modern Dark design system tokens (`theme.css`) and reusable component classes (`global.css`) with WCAG-aligned focus states and `prefers-reduced-motion` support.
- Implemented typed `en` and `pt-BR` localization (`src/i18n/`) with compiler-enforced key parity and immediate reactive switching across the entire UI.
- Implemented pure runtime settings validation (`validateSettings`, `sanitizeSettings`) in `@subtitleme/shared-types` and browser-agnostic `SettingsRepository` in `@subtitleme/subtitle-storage`.
- Built isolated Chrome Storage service (`src/services/settings-storage.ts`) with cross-view `chrome.storage.onChanged` synchronization and non-crashing error handling.
- Built reusable accessible Vue components: `BrandLogo`, `ToggleSwitch`, `RangeSlider`, `SubtitlePreview`, `LanguageSelector`, `SubtitleControls`, `FileImporter`, and `VideoStatus`.
- Implemented the complete Chrome Popup interface and 8-section Settings page (General, Languages, Appearance, Synchronization, Local Files, Keyboard Shortcuts, Privacy, About) with live dual-subtitle preview.
- Added unit and component tests covering settings defaults, validation, persistence, reset, localization switching, and Vue component/page rendering.

### Sprint 01 — Foundation
- Initialized pnpm workspace monorepo (`apps/chrome-extension` and 6 shared packages under `packages/`).
- Configured strict TypeScript (`tsconfig.base.json`), ESLint flat config (TypeScript + Vue 3), Tailwind CSS v4, Pinia, Vite dual-build (extension pages + IIFE content script), and Vitest.
- Created least-privilege Chrome Extensions Manifest V3 configuration and placeholder PNG icons (`16`, `32`, `48`, `128`).
- Defined shared domain contracts in `@subtitleme/shared-types`, `@subtitleme/subtitle-parser`, `@subtitleme/subtitle-core`, `@subtitleme/subtitle-sync`, `@subtitleme/subtitle-renderer`, and `@subtitleme/subtitle-storage`.
- Added initial unit tests (`tests/unit/foundation.test.ts`) and core project documentation under `docs/`.
