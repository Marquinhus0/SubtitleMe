# Security & Privacy

SubtitleMe follows a strict privacy-first, least-privilege architecture.

## Privacy Guarantees

- No user accounts or authentication required.
- No analytics, crash reporting, or external telemetry.
- No external upload of local subtitle files — all parsing and storage happen locally in the browser.
- No collection or storage of browsing history or video viewing history.
- No remote code execution (`eval`, `new Function`, or remotely hosted scripts are strictly forbidden).

## Chrome Extension Permissions (Manifest V3)

| Permission | Justification |
| --- | --- |
| `storage` | Persists user preferences locally via `chrome.storage.local`. |
| `activeTab` | Grants temporary, user-initiated access to the currently active tab when the user interacts with SubtitleMe. |
| `scripting` | Injects the content script on demand into the active tab without requiring permanent access to all websites. |
| `optional_host_permissions` (`https://*/*`, `http://*/*`) | Allows users to opt in to automatic activation on specific domains they choose, without requesting broad permanent access at install time. |

- **On-Demand Injection**: Content scripts are injected into the active tab only when the user opens the Popup (`activeTab` + `chrome.scripting`), never silently across all browsing tabs.
- **Restricted Pages & Permission Denial**: Browser internal pages (`chrome://`, `chrome-extension://`, `edge://`, `about:`, Chrome Web Store) are detected before messaging and handled gracefully with clear localized status feedback.
- **Non-Destructive Native Tracks**: `NativeSubtitleObserver` never permanently mutates host player `TextTrack.mode`; any temporary `'disabled' -> 'hidden'` transition for cue reading is restored on disposal.

## Content Security Policy

```text
script-src 'self'; object-src 'self'
```

## Untrusted Input Handling & IndexedDB Data Handling

- All imported `.srt` and `.vtt` files are treated as untrusted input.
- Oversized files (`> 5 MB`) are rejected before reading their bytes into memory; actual content format is verified independently of filename extensions.
- Normalized cues are stored strictly locally in the browser's IndexedDB (`subtitleme-local-subtitles`) and are never transmitted over the network; raw file blobs are not retained by default.
- Users can inspect storage usage, detach files from the active player, remove individual files, or clear all local subtitle records (with explicit confirmation) without affecting unrelated extension settings.
- Subtitle text is strictly escaped / rendered via safe text nodes (`textContent`) rather than `innerHTML` to prevent XSS injection into host pages or extension views.
- SubtitleMe never attempts to bypass DRM, access restrictions, or extract protected media streams.
