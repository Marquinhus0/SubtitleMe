# Compatibility Matrix

SubtitleMe never claims compatibility with any browser or video platform until it has been verified through automated or documented manual testing.

Status legend: **Tested** · **Partially Tested** · **Unsupported** · **Not Yet Evaluated**

## Browsers

| Browser | Version | Status | Verification Evidence |
| --- | --- | --- | --- |
| Google Chrome for Testing (Chromium MV3) | `159.0.8154.6` (Linux x64) | **Tested** | Full automated E2E (`pnpm test:browser`) verifying MV3 service worker, Popup/Options, IndexedDB SRT/VTT import & persistence, real WebM playback/seek/2x/ended, dual native Shadow DOM rendering, 5-video scaling, and `TextTrack.mode` restoration. |
| Google Chrome (Branded Stable MV3) | `158.0.8127.36` | **Partially Tested** | Shares Blink/MV3 engine; CLI `--load-extension` disabled by Chrome 137+ policy; manual Developer Mode unpacked load validation recommended in Sprint 08. |
| Microsoft Edge (Chromium) | — | **Not Yet Evaluated** | Not installed in VM; planned post-1.0 verification. |
| Non-Chromium Browsers (Firefox / Safari) | — | **Unsupported** | Out of scope for v1.0.0 Chrome MV3 release. |

## Video Players & Platforms

| Player / Platform | Native Tracks | Local Import | Fullscreen | Status |
| --- | --- | --- | --- | --- |
| Standard HTML5 `<video>` (controlled local harness) | Accessible `TextTrack`s verified | Verified | Container fullscreen verified (happy-dom); `<video>`-element fullscreen limited by browser DOM rules | **Tested** |
| Generic HTML5 `<video>` sites (non-DRM, exposed `TextTrack`s) | Supported when exposed | Supported via local import | Container fullscreen supported | **Partially Tested** |
| Browser restricted pages (`chrome://`, Chrome Web Store, `about:`) | N/A | N/A | N/A | **Unsupported** (handled gracefully with clear status) |
| Commercial DRM streaming platforms | Not evaluated | Not evaluated | Not evaluated | **Not Yet Evaluated** (SubtitleMe never bypasses DRM or extracts protected streams) |
