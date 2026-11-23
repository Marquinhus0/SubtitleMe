# Architecture

## Design Principles

1. **Strict Separation of Domain and Browser Layers**: All subtitle parsing, cue lookup, synchronization logic, and track merging live in framework-agnostic packages under `packages/`. Chrome Extension APIs (`chrome.storage`, `chrome.runtime`, content scripts) live exclusively in `apps/chrome-extension/`.
2. **Adapter Pattern for Video Players**: Streaming platforms expose video and text tracks inconsistently. `PlayerAdapter` isolates DOM/player access from the subtitle engine.
3. **Shadow DOM Style Isolation**: The subtitle overlay renders inside a closed/open Shadow DOM root attached relative to the active player container so host page CSS cannot break subtitle rendering and extension CSS cannot leak onto host pages.
4. **Future Platform Readiness**: The shared core (`@subtitleme/shared-types`, `@subtitleme/subtitle-parser`, `@subtitleme/subtitle-core`) is pure TypeScript with no DOM dependency, enabling future reuse in Microsoft Edge, other Chromium browsers, and a Node.js Stremio Addon.

## Package Dependency Graph

```text
apps/chrome-extension
  ├── @subtitleme/shared-types
  ├── @subtitleme/subtitle-parser   ──▶ @subtitleme/shared-types
  ├── @subtitleme/subtitle-core     ──▶ @subtitleme/shared-types
  ├── @subtitleme/subtitle-sync     ──▶ @subtitleme/shared-types, @subtitleme/subtitle-core
  ├── @subtitleme/subtitle-renderer ──▶ @subtitleme/shared-types
  └── @subtitleme/subtitle-storage  ──▶ @subtitleme/shared-types
```

## Build Architecture (Chrome Extension MV3)

- `vite.config.ts` compiles `popup/index.html`, `options/index.html`, and `src/background/service-worker.ts` (ES module service worker) and copies `public/` (`manifest.json` + icons) into `apps/chrome-extension/dist/`.
- `vite.content.config.ts` compiles `src/content/index.ts` as a self-contained IIFE bundle (`dist/content/index.js`) to guarantee reliable execution across arbitrary host origins without runtime chunk-loading errors.

## UI, Design System & Localization (Sprint 02)

- **Design System Tokens**: Centralized in `apps/chrome-extension/src/styles/theme.css` (Modern Dark palette, typography scale, spacing, radii, shadows, focus rings, transitions, and `prefers-reduced-motion` support) with semantic component classes in `global.css`.
- **Localization (`src/i18n/`)**: Strongly typed translation dictionaries (`en.ts`, `pt-BR.ts`) with compiler-enforced key parity (`Record<TranslationKey, string>`). The `useI18n()` composable binds reactively to `settingsStore.settings.general.uiLanguage` so locale changes propagate instantaneously across Popup and Settings.
- **Settings Validation & Persistence**: Pure schema validation (`validateSettings`, `sanitizeSettings`) lives in `@subtitleme/shared-types`. Browser-agnostic `SettingsRepository` + `StorageAreaAdapter` live in `@subtitleme/subtitle-storage`. `apps/chrome-extension/src/services/settings-storage.ts` binds `chrome.storage.local` (with graceful fallback and `chrome.storage.onChanged` cross-view sync) so UI components never touch storage APIs directly.

## Subtitle Parsing Engine (Sprint 03)

All parsing logic resides inside `packages/subtitle-parser/` with zero DOM, Vue, or Chrome API dependencies, allowing direct reuse in browser content scripts, Node.js tests, and the future Stremio Addon:

- **Modules**:
  - `timestamp.ts`: Pure integer-millisecond timestamp parsing (`parseSrtTimestamp`, `parseVttTimestamp`, `normalizeTimestamp`, `formatTimestamp`) avoiding floating-point precision drift.
  - `text-normalizer.ts`: UTF-8 BOM stripping, LF/CRLF/CR detection and normalization, safe removal of executable `<script>`/`<style>` blocks and subtitle formatting tags (`<i>`, `<b>`, `<font>`, `<v>`, `<c>`, VTT inline timestamps, ASS overrides) while preserving meaningful text, followed by safe HTML entity decoding.
  - `blocks.ts`: Single-pass linear block splitter preserving 1-based line numbers for diagnostics.
  - `srt-parser.ts` & `vtt-parser.ts`: Dedicated SRT and WebVTT parsers with structured error recovery and metadata extraction (`STYLE`, `REGION`, `NOTE` counts, header metadata, cue settings).
  - `validator.ts`: Post-parse cue validation preserving valid overlapping cues and flagging duplicate IDs, empty text, and timestamp anomalies.
  - `detect-format.ts` & `index.ts`: Format auto-detection and unified `parseSubtitle(content, format?, options?)` entrypoint.
- **Zero-Duration Policy**: Cues where `end === start` are rejected by default with `ZERO_DURATION_CUE` (`error`), and may be explicitly enabled via `allowZeroDuration: true` (emitting a `warning` diagnostic). Cues where `end < start` are always rejected with `INVALID_TIMESTAMP_ORDER`.
- **Diagnostic Codes**: `EMPTY_INPUT`, `UNSUPPORTED_FORMAT`, `MISSING_VTT_HEADER`, `INVALID_TIMESTAMP`, `INVALID_TIMESTAMP_ORDER`, `ZERO_DURATION_CUE`, `MALFORMED_CUE_BLOCK`, `EMPTY_CUE_TEXT`, `DUPLICATE_CUE_ID`, `OVERLAPPING_CUES`, `UNSUPPORTED_MARKUP_STRIPPED`.
- **Known Format Limitations (v1.0)**: Inline styling (italics, bold, per-span colors) is normalized to plain text for safe `textContent` rendering; ASS/SSA formats are planned post-1.0.

## Dual Subtitle Engine (Sprint 04)

- **Track Management & O(log n) Lookup (`packages/subtitle-core`)**:
  - `CueIndex` sorts cues by `(start, end)` and precomputes a prefix-maximum `maxEndPrefix` array. `findActiveCues()` performs a binary search for the rightmost `start <= timeMs` and prunes backward using `maxEndPrefix`, guaranteeing O(log n + k) lookup even with arbitrarily nested overlapping cues.
  - **Interval Policy**: Half-open `[start, end)` (`start <= timeMs && timeMs < end`) prevents single-frame flicker at adjacent cue boundaries.
  - `TrackManager` manages up to two active display slots (`primary`, `secondary`) with independent languages, visibility toggles, stacking order, and integer millisecond offsets (`adjustedTimeMs = timeMs - offsetMs`, so positive offsets delay subtitles).
  - `PlayerSessionRegistry` isolates per-video sessions with deterministic active-player promotion and clean disposal.
- **Subtitle Merger (`packages/subtitle-core/src/subtitle-merger.ts`)**:
  - Combines two independently timed tracks via boundary-union timeline segmentation: applies independent offsets, sorts the unique union of all cue start/end boundaries, evaluates active cues on each elementary interval `[t_k, t_{k+1})`, deduplicates identical lines, coalesces adjacent identical segments, and serializes valid WebVTT or SRT for future Stremio Addon reuse.
- **Synchronization Engine (`packages/subtitle-sync`)**:
  - `createSyncEngine()` is browser-independent, reads integer ms from a `PlaybackClock`, and deduplicates identical cue snapshots to prevent redundant renders.
  - `createMediaSyncController()` isolates the `requestAnimationFrame` loop at the `HTMLMediaElement` boundary: runs rAF only while playing, cancels immediately on `pause`/`ended`, responds instantaneously to `seeking`/`seeked`/`ratechange`/`durationchange`, and cleans up all listeners on `dispose()`.
- **Shadow DOM Overlay Renderer (`packages/subtitle-renderer`)**:
  - `createShadowSubtitleRenderer()` mounts a single `pointer-events: none` Shadow DOM host per player, prevents duplicate mounts, reuses DOM nodes, caches text & style signatures, renders untrusted text strictly via `textContent` with `white-space: pre-line`, and observes container resize (`ResizeObserver`) and `fullscreenchange`.

## Local Files & IndexedDB Persistence (Sprint 05)

- **IndexedDB Schema (`packages/subtitle-storage/src/indexeddb-subtitle-repository.ts`)**:
  - Database: `subtitleme-local-subtitles` (v1), object store `subtitles` (`keyPath: 'id'`).
  - Indexes: `by_language` (`language`), `by_contentHash` (`contentHash`, unique — prevents duplicate imports), `by_importedAt` (`importedAt`).
  - Schema migrations run inside `onupgradeneeded` keyed on `event.oldVersion`.
  - Normalized `SubtitleCue[]` are persisted directly so imported files never require reparsing after Chrome restarts; `originalContent` is omitted by default to conserve storage quota.
- **Encoding Strategy (`packages/subtitle-parser/src/encoding.ts`)**:
  - `decodeSubtitleBytes()` checks UTF-8 BOM, UTF-16 LE/BE BOM, then strict UTF-8 (`fatal: true`). When invalid UTF-8 bytes are detected, falls back to `windows-1252` (preserving legacy Portuguese/Spanish accents) and emits an explicit warning for user verification in the preview.
- **Import Pipeline (`apps/chrome-extension/src/services/subtitle-import.ts`)**:
  - Rejects oversized files (`> 5 MB`) before reading into memory, validates extension and content format (never trusting extension alone), parses cues via `parseSubtitle()`, computes deterministic 64-bit FNV-1a `contentHash` for duplicate checks, and requires explicit user confirmation in `FileImporter.vue` before persisting to IndexedDB.
- **Runtime Track Association (`apps/chrome-extension/src/services/track-bridge.ts`)**:
  - Separates persistent IndexedDB record IDs (`record.id`) from runtime player track IDs (`runtime:${playerId}:local:${record.id}`), rebuilding runtime tracks cleanly whenever a player session attaches without duplicate registrations.

## Browser & Player Integration (Sprint 06)

- **Player Detection & Ranking (`apps/chrome-extension/src/content/player-detector.ts`)**:
  - Uses a debounced `MutationObserver` (80 ms) filtering mutations to nodes containing `<video>` to avoid repeated full-DOM scans.
  - `scoreVideoCandidate()` ranks candidate players by fullscreen (+1000), active playback (+400), visibility (+200 / -500 hidden), rendered area (+200 / -200 tiny ads), recent user interaction (+150 decaying over 30s), and viewport intersection (+50).
- **Native TextTrack Observation (`subtitle-observer.ts` & `player-adapter.ts`)**:
  - Observes `addtrack`, `removetrack`, `change`, and per-track `cuechange` events on `HTMLVideoElement.textTracks`.
  - Records original `TextTrack.mode` in a `WeakMap` before switching `'disabled'` to `'hidden'` (required by Chromium to expose `.cues`), and restores the original mode unconditionally on `dispose()`.
  - Normalizes cue timestamps to integer ms and sanitizes cue text via `normalizeSubtitleText()`.
- **Fullscreen Overlay Strategy (`overlay-manager.ts`)**:
  - Listens to `fullscreenchange`. When `document.fullscreenElement` is an ancestor container enclosing `<video>`, re-parents the Shadow DOM host directly inside `fullscreenElement`. On fullscreen exit, restores the overlay to the normal player container and restores any temporary inline `position: relative` adjustment on unmount.
- **Idempotent Orchestration & Messaging (`content/index.ts`, `player-lifecycle.ts`, `services/tab-messaging.ts`)**:
  - Guards content script initialization with `Symbol.for('subtitleme.content.controller')` to prevent duplicate observers on reinjection.
  - Uses `requestId`-tracked, runtime-validated (`isValidExtensionMessage`) messages with on-demand `activeTab` + `chrome.scripting` injection and explicit restricted-page (`chrome://`, Web Store) handling.
- **Resilience Hardening (Sprint 07)**:
  - `buildLocalSubtitleRecord()` strips Vue 3 reactive `Proxy` wrappers into plain objects before IndexedDB `structuredClone` persistence, preventing `DataCloneError`.
  - `OverlayManager.reconcileMountContainer()` wraps Shadow DOM attachment with a safe `document.body` fallback if an exotic host container rejects attachment.

## Stremio Addon Architecture (Post-1.0 — Sprint 09 PoC)

Stremio players do not reliably support rendering two simultaneous native subtitle tracks. To support Stremio without rewriting the subtitle engine:

- `@subtitleme/subtitle-core` provides `mergeSubtitleTracks()` and `serializeSubtitleCues('vtt')` to combine two normalized `SubtitleTrack` instances (with independent offsets, overlap handling, and chronological ordering) into a single valid WebVTT output.
- `apps/stremio-addon` (Node.js + TypeScript + official `stremio-addon-sdk` v1.6.10) implements the Sprint 09 Proof of Concept reusing `@subtitleme/subtitle-parser` and `@subtitleme/subtitle-core` with a pluggable `SubtitleSourceProvider`, bounded TTL `GeneratedSubtitleCache`, and CORS-enabled `/generated/:token.vtt` delivery.
- See [STREMIO_ARCHITECTURE.md](STREMIO_ARCHITECTURE.md), [STREMIO_INTEGRATION.md](STREMIO_INTEGRATION.md), and `docs/adr/ADR-001..003` for full architectural decisions and constraints. The Chrome Extension v1.0.0 RC remains completely independent.
