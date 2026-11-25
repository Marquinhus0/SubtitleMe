# SubtitleMe — Stremio Player Compatibility (`1.0.0-rc.3`, Sprint 15.5)

- **Stremio Desktop**: `5.0.28` (`stremio-shell-ng.exe` / Chromium WebView2 shell loading `https://web.stremio.com`)
- **Addon Installation**: **PASS**
- **Subtitles Fetch (`127.0.0.1:7000`)**: **FAIL** — Blocked by missing `Access-Control-Allow-Private-Network: true` header on PNA preflight from HTTPS WebView2 origin, plus omitted `idPrefixes` in `manifest.ts`.
- **Dual Subtitle Rendering / Offsets / 10-min Stability**: **BLOCKED** (remediated in `1.0.0-rc.4`).
- **OpenSubtitles REST API v1**: **NOT TESTED LIVE** in `rc.3` (`OPENSUBTITLES_API_KEY` not set).
