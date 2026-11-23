# Release Notes — SubtitleMe v1.0.0 (Release Candidate)

**Release Tag**: `v1.0.0-rc`  
**Platform**: Google Chrome (Manifest V3)  
**Tagline**: Two languages. One experience.

---

## What's New in 1.0.0

SubtitleMe 1.0.0 is the initial release of our free, privacy-first dual-subtitle browser extension for compatible HTML5 video players.

## Features

- **Dual Subtitle Playback**: Render two independent subtitle tracks simultaneously over compatible HTML5 `<video>` players using an isolated Shadow DOM overlay.
- **Native & Local Subtitles**:
  - Automatically detects accessible HTML5 `TextTrack`s without permanently altering your native player settings.
  - Import local `.srt` and `.vtt` files via drag-and-drop or file picker with live pre-save preview, encoding detection (UTF-8, BOM, and Windows-1252 fallback), duplicate detection, and local IndexedDB storage.
- **Independent Synchronization**: Fine-tune timing offsets independently in milliseconds for primary and secondary tracks, with smooth `requestAnimationFrame` synchronization across play, pause, seek, and playback speed changes.
- **Modern Dark Interface & Live Preview**:
  - Clean Popup for quick switching, track selection, and offset adjustments.
  - Full 8-section Settings page with immediate live preview for font family, font size, primary/secondary colors, background opacity, outline, shadow, vertical position, and line spacing.
  - Full interface localization in **English (`en`)** and **Portuguese — Brazil (`pt-BR`)**.
- **Multi-Video Isolation**: Independently manages multiple `<video>` elements on the same page with smart active-player ranking.

## Privacy

- 100% local execution — no account, no subscription, no backend, no analytics, and no telemetry.
- Local subtitle files are never uploaded externally and can be removed individually or cleared completely at any time.
- Least-privilege Manifest V3 permissions (`storage`, `activeTab`, `scripting`).

## Compatibility

- **Verified**: Chromium MV3 (`Google Chrome for Testing 159.0.8154.6`) on controlled HTML5 `<video>` players.
- **Planned (Post-1.0)**: Microsoft Edge verification, ASS/SSA format support, and Stremio Addon integration.

## Known Limitations

- Sites that do not expose standard HTML5 `TextTrack`s (or use DRM/canvas captions) require importing local `.srt` or `.vtt` files.
- Fullscreen directly on a bare `<video>` element cannot display DOM overlays due to browser specifications; container/wrapper fullscreen is supported.
- Browser-level global keyboard shortcuts (`chrome.commands`) are planned for a future update.
