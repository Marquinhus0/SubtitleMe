# Release Checklist — SubtitleMe v1.0.0 (RC)

## Approved

- [x] **Manifest validated**: `manifest_version: 3`, version `1.0.0`, least-privilege permissions (`storage`, `activeTab`, `scripting`, `optional_host_permissions`), strict CSP (`script-src 'self'; object-src 'self'`), zero missing file references.
- [x] **Version consistent**: `1.0.0` verified across `package.json`, `apps/chrome-extension/package.json`, `apps/chrome-extension/public/manifest.json`, `docs/RELEASE_NOTES.md`, and `dist/release/SHA256SUMS.txt`.
- [x] **Final icons validated**: Anti-aliased `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` verified visually and via automated PNG signature tests.
- [x] **Build approved**: `pnpm build` succeeded cleanly (`apps/chrome-extension/dist/`).
- [x] **Unit tests approved**: All unit tests passing via `pnpm test`.
- [x] **Integration tests approved**: All integration tests passing via `pnpm test`.
- [x] **Chromium E2E approved**: Real `Google Chrome for Testing 159.0.8154.6` E2E suite passed (`pnpm test:browser`).
- [x] **ZIP generated reproducibly**: `dist/release/subtitleme-chrome-v1.0.0.zip` (83,908 bytes, 14 files) verified identical SHA-256 across consecutive builds.
- [x] **ZIP extracted cleanly**: Verified `manifest.json` at archive root and zero disallowed/dev/source/secret files.
- [x] **Extracted package installation validated**: `pnpm test:release` loaded the extracted ZIP folder into real Chromium (`0` uncaught page errors).
- [x] **Popup validated**: Rendering, language sync, and persisted local file dropdowns verified in real Chromium.
- [x] **Settings validated**: All 8 sections, `en`/`pt-BR` switching, and IndexedDB management verified in real Chromium.
- [x] **SRT import validated**: Parsing, preview, confirmation, duplicate rejection, and persistence verified in real Chromium.
- [x] **VTT import validated**: Parsing, preview, confirmation, and persistence verified in real Chromium.
- [x] **Dual-subtitle rendering validated**: Simultaneous English + Portuguese rendering inside Shadow DOM verified across play/seek/speed/ended in real Chromium.
- [x] **Persistence validated**: IndexedDB records and settings retained across Popup close/reopen.
- [x] **SHA-256 generated**: Recorded in `dist/release/SHA256SUMS.txt`.
- [x] **Documentation completed**: `ARCHITECTURE.md`, `REQUIREMENTS.md`, `TESTING.md`, `SECURITY.md`, `SECURITY_AUDIT.md`, `ACCESSIBILITY_AUDIT.md`, `PERFORMANCE_AUDIT.md`, `COMPATIBILITY.md`, `INSTALLATION.md`, `STORE_LISTING.md`, `RELEASE_NOTES.md`, `RELEASE_CHECKLIST.md`, `CHANGELOG.md`, `ROADMAP.md`.
- [x] **Limitations documented**: Bare `<video>` fullscreen, non-exposed native tracks, unverified streaming platforms, and unimplemented `chrome.commands`.
- [x] **Privacy reviewed**: Zero backend, zero uploads, zero telemetry, zero remote scripts.
- [x] **No secrets or unnecessary files in package**: Verified by automated forbidden-pattern checks in `scripts/package-release.mjs`.

## Pending (Pre-Public Store Submission — Outside Sprint 08 Scope)

- [ ] Manual Developer Mode unpacked smoke test on branded desktop Google Chrome Stable (`chrome://extensions`).
- [ ] Manual screen-reader walkthrough (NVDA / VoiceOver / ChromeVox) on desktop OS.
- [ ] Chrome Web Store promotional screenshots (`1280×800`) and store submission upload (explicitly excluded from Sprint 08).

## Not Applicable (v1.0.0 Scope)

- [ ] Stremio Addon packaging (scheduled post-1.0; shared core merger already prepared).
- [ ] Microsoft Edge Add-ons / Firefox AMO store submission (out of v1.0.0 scope).
