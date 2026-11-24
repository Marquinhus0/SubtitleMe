# SubtitleMe — Stremio Player Compatibility Report (Sprint 15.3)

**Stremio Desktop Tested**: `5.0.28` (`stremio-shell-ng.exe`, Windows 11 X64)  
**Release Candidate**: `1.0.0-rc.2`

| Capability | Status in Stremio Desktop `5.0.28` | Notes |
| :--- | :--- | :--- |
| Addon manifest installation (`http://127.0.0.1:7000/<config>/manifest.json`) | **PASS** | Addon recognized and installed cleanly in Stremio Desktop `5.0.28` |
| Subtitle picker visibility (manual local-only Companion) | **FAIL** | No SubtitleMe subtitle option appeared during real playback test (`registeredSubtitles: 0` / requires manual per-`contentId` upload) |
| Simultaneous dual-language VTT rendering in player | **NOT VERIFIED / BLOCKED** | Playback never displayed a SubtitleMe track |
| Offset, stacking order, pause/resume, seek, 10-min stability | **BLOCKED** | Blocked by absence of selectable subtitle track in player |
| Automatic subtitle fetching (e.g. OpenSubtitles v3) | **NOT IMPLEMENTED** | `1.0.0-rc.2` only enables `LocalFileSubtitleSource` by default |
