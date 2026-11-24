# SubtitleMe — Stremio Desktop Limitations (Sprint 15.3)

1. **No Automatic Subtitle Source (No OpenSubtitles v3)**: `1.0.0-rc.2` requires manual per-`contentId` upload of both `.srt`/`.vtt` files in `http://127.0.0.1:7000/configure`. Opening any Stremio title without pre-uploaded local files results in `{"subtitles":[]}` and no SubtitleMe option in the player.
2. **Memory-Only Default Storage**: Unless persistence is explicitly enabled (`SUBTITLEME_PERSISTENCE=1` or consent toggle in `/configure`), restarting the Companion clears all uploaded subtitles (`registeredSubtitles: 0`).
3. **Unverified Player Rendering**: Simultaneous dual-language WebVTT rendering, stacking order, offsets, pause/resume, seek, and 10-minute stability inside Stremio Desktop `5.0.28` remain **unverified**.
4. **Loopback-Only Scope**: `http://127.0.0.1:7000` only works on the same desktop machine; Stremio Web (HTTPS) and mobile/TV clients are unsupported.
