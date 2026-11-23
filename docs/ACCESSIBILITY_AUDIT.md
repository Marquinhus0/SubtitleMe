# Accessibility Audit Report — Sprint 07

## Scope
WCAG 2.2 Level AA audit of the SubtitleMe Chrome Extension Popup (`popup/App.vue`), 8-section Settings page (`options/App.vue`), and all reusable UI components (`ToggleSwitch`, `RangeSlider`, `LanguageSelector`, `SubtitleControls`, `FileImporter`, `VideoStatus`, `SubtitlePreview`).

## Methodology
1. Programmatic WCAG 2.2 AA contrast ratio verification (`>= 4.5:1` for normal text) across all dark surfaces (`#0B0D12`, `#151923`, `#1C2230`) in `tests/unit/qa-resilience.test.ts`.
2. Semantic HTML & ARIA review of switches, sliders, form labels, live status regions, alerts, and destructive confirmations.
3. Real Chromium keyboard navigation (`Tab` focus progression) and responsive layout review at 200% zoom.
4. Reduced-motion (`prefers-reduced-motion: reduce`) verification in `theme.css` and `global.css`.

## Scenarios Tested
- Contrast ratios of `--sm-text-primary`, `--sm-text-secondary`, and `--sm-text-muted` on all three dark surface tiers.
- Custom switch semantics (`role="switch"`, `aria-checked`, `aria-labelledby`, `aria-describedby`, disabled states).
- Range slider semantics (`aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`).
- File dropzone keyboard activation (`tabindex="0"`, `Enter` and `Space`), `role="alert"` errors, and `role="status"` confirmations.
- `aria-live="polite"` on `VideoStatus.vue` and `aria-current="page"` on Settings navigation.
- Keyboard `Tab` focus verification in real Chromium Popup (`tests/e2e/chrome-extension.mjs`).

## Issues Found & Fixes Applied
1. **High — Muted Text Contrast Below WCAG AA**: `--sm-text-muted` (`#6C7385`) produced a `3.30:1` contrast ratio on `--sm-surface-elevated` (`#1C2230`), below the WCAG 2.2 AA `4.5:1` threshold for small text. **Fixed** by updating `--sm-text-muted` to `#8991A5` in `apps/chrome-extension/src/styles/theme.css` (achieving `>= 4.97:1` on `#1C2230`, `5.5:1` on `#151923`, and `6.2:1` on `#0B0D12`), verified by automated test in `tests/unit/qa-resilience.test.ts`.
2. **Medium — Fixed Popup Width at 200% Zoom**: `popup/App.vue` used fixed `w-[380px]`, risking horizontal overflow at 200% browser zoom. **Fixed** by adding `max-w-full min-w-[300px]`.

## Results
- All dark surface text tokens pass WCAG 2.2 AA (`>= 4.5:1`) with automated regression tests.
- Full keyboard navigation works without keyboard traps; visible focus rings (`--sm-focus-ring`) apply via `:focus-visible`.
- Destructive actions (Reset Configuration, Remove File, Clear All Local Subtitles) require explicit two-step confirmation with clear button label updates.

## Remaining Limitations & Pending Items
- Manual screen-reader testing with NVDA / VoiceOver / ChromeVox has not been performed in this headless Linux VM and is recommended as a pre-store release check in Sprint 08.
