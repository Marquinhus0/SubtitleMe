# SubtitleMe — Stremio Desktop Installation Report (Sprint 15.3)

**Release Candidate**: `1.0.0-rc.2`  
**SHA-256**: `6e52ba59a7134901ac5b86669eec8c08310aaddd417b6efcbc5aa11465c6a71a`  
**Stremio Desktop**: `5.0.28` (`stremio-shell-ng.exe`)  
**Companion Launch Command**: `%TEMP%\subtitleme-rc2-visual-validation\bin\start-companion.cmd` (PID `25416`, `127.0.0.1:7000`)

## Installation Method
- **Mechanism**: Official Stremio Desktop **Addons → + Add Addon** with configured HTTP loopback manifest URL (no session tokens exposed):
  `http://127.0.0.1:7000/%7B%22primaryLanguage%22%3A%22pt-BR%22%2C%22secondaryLanguage%22%3A%22en%22%2C%22primaryOffsetMs%22%3A%220%22%2C%22secondaryOffsetMs%22%3A%220%22%2C%22order%22%3A%22primary-top%22%2C%22bilingualEnabled%22%3A%22on%22%7D/manifest.json`
- **Observed Result**: **PASS** — User confirmed the addon was successfully added/installed in Stremio Desktop `5.0.28`.
- **Follow-up Observation**: During playback in Stremio Desktop `5.0.28`, **no subtitles or subtitle options from SubtitleMe appeared** (see `STREMIO_DESKTOP_VISUAL_VALIDATION.md` for root-cause investigation).
