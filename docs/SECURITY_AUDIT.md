# Security Audit Report — Sprint 07

## Scope
Full security and privacy audit of the SubtitleMe Chrome Extension (Manifest V3), shared subtitle processing packages, content script isolation, local file import pipeline, IndexedDB storage, and dependency tree.

## Methodology
1. Static pattern audit across `apps/` and `packages/` for unsafe DOM/JS primitives (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `v-html`, `eval`, `new Function`, `postMessage`, `document.write`, `fetch`).
2. Manifest V3 permissions and Content Security Policy (CSP) verification.
3. Local file import & untrusted subtitle payload testing (SRT/VTT XSS vectors, spoofed extensions, oversize files, encoding edge cases).
4. Dependency vulnerability scan via `pnpm audit --audit-level=moderate`.

## Scenarios Tested
- `<script>` and `<style>` blocks inside SRT/VTT files and native `TextTrackCue`s.
- `<img src=x onerror=alert(1)>` XSS payloads rendered via `ShadowSubtitleRenderer` and Vue preview templates.
- Spoofed `.srt` files containing plain text or invalid content.
- Oversized files (`> 5 MB`) rejected prior to `ArrayBuffer` memory read.
- Duplicate `contentHash` protection in IndexedDB.
- Runtime message validation (`isValidExtensionMessage`) rejecting malformed commands and stale player IDs.
- Restricted browser page detection (`chrome://`, `chrome-extension://`, Chrome Web Store).

## Results
- **Unsafe DOM/Execution Primitives**: **0** runtime occurrences found across all `apps/` and `packages/`. All subtitle rendering uses `textContent` or Vue text interpolation.
- **Manifest V3 & CSP**: Least-privilege permissions only (`storage`, `activeTab`, `scripting`, `optional_host_permissions`). Strict CSP: `script-src 'self'; object-src 'self'`. Zero remote runtime scripts.
- **Privacy**: Zero network calls (`fetch`/XHR), zero analytics, zero telemetry, zero external uploads. All settings (`chrome.storage.local`) and subtitles (`subtitleme-local-subtitles` IndexedDB) stay 100% local.
- **DRM & Protected Media**: Zero DRM bypasses or protected stream extraction attempts.
- **Dependency Audit (`pnpm audit`)**:
  - **0 vulnerabilities** in production runtime dependencies (`vue`, `pinia`) bundled into `apps/chrome-extension/dist/`.
  - **2 moderate** transitive dev-only advisories (`glob <=14.0.1` and `minimatch <11.0.1` under `@vue/test-utils > js-beautify`), strictly excluded from the extension build.

## Issues Found & Fixes Applied
- **Critical Bug (Reliability/Storage)**: Real Chromium E2E testing uncovered a `DataCloneError` when saving Vue 3 reactive Proxy `cues` arrays into IndexedDB via `structuredClone`. **Fixed** in `apps/chrome-extension/src/services/subtitle-import.ts` (`buildLocalSubtitleRecord`) by explicitly cloning cues into plain JSON-safe objects before persistence.
- **Medium (Dev Dependency Advisory)**: Transitive `glob`/`minimatch` moderate advisories under `@vue/test-utils` — tracked for upstream `@vue/test-utils` update; zero runtime exposure in the extension bundle.

## Remaining Limitations & Pending Items
- Full browser-level `chrome.commands` keyboard shortcut permissions/declarations are not yet registered (planned post-MVP or Sprint 08 manifest review).
- Subresource integrity / Chrome Web Store zip packaging audit scheduled for Sprint 08.
