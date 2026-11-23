# Roadmap

## v1.0.0 — Chrome Extension MVP

| Sprint | Focus | Status |
| --- | --- | --- |
| Sprint 01 | Foundation (monorepo, pnpm, TypeScript, Vite, Vue, MV3, ESLint, Vitest, docs) | Completed |
| Sprint 02 | Design System (Modern Dark theme, i18n en/pt-BR, Popup, 8-section Settings, Live Preview) | Completed |
| Sprint 03 | Subtitle Parsing (SRT & WebVTT parsers, timestamp normalization, validation, unit tests) | Completed |
| Sprint 04 | Dual Subtitle Engine (track manager, binary search, rAF sync, Shadow DOM overlay, merger) | Completed |
| Sprint 05 | Local Files (drag & drop import, validation, IndexedDB storage, language assignment, removal) | Completed |
| Sprint 06 | Player Integration (HTML5 detection, native track observation, adapters, fullscreen, lifecycle) | Completed |
| Sprint 07 | Quality Assurance (unit, integration, Playwright E2E harness, accessibility, security, perf) | Completed |
| Sprint 08 | Release Candidate (manifest audit, store assets, production build, installation verification) | Completed |

## Post-1.0

| Sprint | Focus | Status |
| --- | --- | --- |
| Sprint 09 | Stremio Addon Architecture, Feasibility, ADRs & Local HTTP PoC (`apps/stremio-addon`) | Completed |
| Sprint 10 | Stremio Addon MVP (Local Companion, Configure UI, LocalFileSubtitleSource, Cache Security, Opt-In OpenSubtitles Contract) | Completed |
| Sprint 11 | Stremio Integration Validation Prep, Optional Local Persistence, Lifecycle, Security Audit & Source Fallback Policy | Completed |
| Sprint 12 | Release Readiness, Real-World Validation Prep, Linux/Windows Launchers, Symlink & Crash Recovery Hardening | Completed |
| Sprint 13 | External Validation Kit, TOCTOU/Symlink Security Closure, Windows Script Hardening & Stremio RC `1.0.0-rc.1` | Completed |
| Sprint 14 | Final Validation, GA Readiness Assessment & Release Decision (`NO-GO` — Hold `1.0.0-rc.1` Pending External Visual Sign-Off) | Completed |
| Sprint 15 | External Validation Re-Verification, RC SHA-256 Check, GA Scope Definition (Option A: Linux GA Recommended) & Mandatory `NO-GO` Hold (`1.0.0-rc.1`) | Completed |
| External Gate | Human Graphical Stremio Desktop Validation (15 Scenarios + Real Screenshots) → Unblocks `1.0.0` GA Promotion | Pending External Execution |

- Additional subtitle formats: ASS / SSA
- Microsoft Edge and other Chromium browsers verification
