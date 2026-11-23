# Performance Audit Report — Sprint 07

## Scope
Reproducible performance measurement of SubtitleMe across parsing, binary-search lookup, IndexedDB storage, Shadow DOM rendering, multi-player scaling (1–5 videos), and production bundle sizes.

## Test Environment
- **OS**: Linux x64 (Ubuntu 24.04 VM)
- **Runtime**: Node.js `v22.23.5`, pnpm `12.21.0`
- **Browser**: Google Chrome for Testing `159.0.8154.6` (`--headless=new`)

## Measured Results

| Benchmark / Scenario | Environment | Measured Result |
| --- | --- | --- |
| Parse 5,000 multiline bilingual WebVTT cues (~500 KB) | Vitest / Node 22 (`vtt-parser.test.ts`, 11 tests total) | `138 ms` (entire suite) |
| 2,000 binary-search lookups on 10,000-cue `CueIndex` | Vitest / Node 22 (`subtitle-core.test.ts`, 7 tests total) | `55 ms` (entire suite) |
| Save + read 3,000-cue normalized record in IndexedDB | Vitest / `fake-indexeddb` (`indexeddb-repository.test.ts`, 4 tests total) | `43 ms` (entire suite) |
| Content script injection & Shadow DOM overlay mount | Real Chromium 159 (`pnpm test:browser`) | `61 ms` |
| SRT import -> parse -> preview -> IndexedDB save -> UI render | Real Chromium 159 (`pnpm test:browser`) | `178 ms` |
| Scale from 1 to 5 simultaneous `<video>` players & mount 5 overlays | Real Chromium 159 (`pnpm test:browser`) | `282 ms` |
| Production content script bundle (`dist/content/index.js`) | Vite 8 IIFE build | `39.12 kB` (`11.48 kB` gzip) |

## Architectural Efficiency Verification
- **Rendering**: `createShadowSubtitleRenderer` reuses mounted DOM nodes and caches both text and style signatures, performing zero DOM mutations when active cues and styles have not changed.
- **Synchronization**: `createMediaSyncController` runs a single `requestAnimationFrame` loop only while playing; cancels immediately on `pause`, `ended`, `stop`, or `dispose`; prevents duplicate loops on repeated `play`/`playing` events.
- **Observers & Cleanup**: `PlayerDetector` debounces `MutationObserver` callbacks (80 ms) and filters mutations strictly to nodes containing `<video>`. Removing all 5 videos in `qa-resilience.test.ts` and `chrome-extension.mjs` leaves `0` active sessions and `0` orphaned `[data-subtitleme-overlay]` DOM hosts.

## Issues Found & Remaining Limitations
- No performance regressions or memory leaks were observed in 1–5 player lifecycle cycles.
- Long-duration (2+ hour) real-time playback heap profiling in headed Chrome is recommended before Chrome Web Store public launch.
