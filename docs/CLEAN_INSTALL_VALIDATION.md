# SubtitleMe — Clean Install Validation Report (`1.0.0-rc.2`)

**Artifact Tested**: `dist/release/subtitleme-stremio-v1.0.0-rc.2.tar.gz`  
**SHA-256**: `6e52ba59a7134901ac5b86669eec8c08310aaddd417b6efcbc5aa11465c6a71a`  
**Environment**: Windows 11 (`NT 10.0.26300.0`, `X64`), Node.js `v24.19.0`, isolated `os.tmpdir()` directories outside the monorepo  
**Executed At**: `2026-11-24T00:52:40Z`  

---

## 17-Scenario Clean-Install Validation Matrix

| ID | Scenario | Environment | Procedure | Expected | Observed | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 01 | Extract in directory without spaces | Windows 11 X64, `os.tmpdir()` | `tar -xzf subtitleme-stremio-v1.0.0-rc.2.tar.gz` into `clean-nospace` | `dist/index.mjs` and `node_modules/stremio-addon-sdk` present | Extracted cleanly; all runtime files present | **PASS** | `01_extract_no_spaces: PASS` |
| 02 | Extract in directory with spaces | Windows 11 X64, `os.tmpdir()` | Extract into `SubtitleMe Clean Space Dir` | Clean extraction with spaces preserved | Extracted cleanly | **PASS** | `02_extract_with_spaces: PASS` |
| 03 | Extract in directory with Unicode | Windows 11 X64, `os.tmpdir()` | Extract into `SubtitleMe Ação Café 日本語` (with Unicode `cwd`) | Clean extraction into accented/Unicode path | Extracted cleanly (`tar` executed with Unicode `cwd`) | **PASS** | `03_extract_unicode: PASS` |
| 04 | Launch via Node.js (all 3 paths + module import) | Windows 11 X64, Node `v24.19.0` | Run `node dist/index.mjs` in no-space, space, and Unicode dirs; also test `import()` | All 3 direct runs serve `/companion/health` (`200 OK`); `import()` does not auto-start | `7021`, `7022`, `7023` all returned `200 OK` (`127.0.0.1`); `import()` returned module with `1.0.0-rc.2` without starting server | **PASS** | `04a..04d: PASS` |
| 05 | Launch via Windows PowerShell & CMD | Windows 11 X64, space dir | Run `powershell -NoProfile -ExecutionPolicy Bypass -File bin\start-companion.ps1` and `cmd /c bin\start-companion.cmd` | Both start Companion on `127.0.0.1` without altering global ExecutionPolicy | PS1 (`7024`) and CMD (`7025`) both returned `200 OK` on `/companion/health` | **PASS** | `05a_powershell`, `05b_cmd: PASS` |
| 06 | Launch with available port | Windows 11 X64, space dir | Start Companion on free port `7026` | Binds cleanly to `127.0.0.1:7026` | Started cleanly on `127.0.0.1:7026` | **PASS** | `06_available_port_startup: PASS` |
| 07 | Occupied port handling | Windows 11 X64, space dir | Start second Companion instance on busy port `7026` | Exits non-zero (`1`) with clear diagnostic on stderr | Exited code `1`: `[SubtitleMe Companion] Port 7026 is already in use on 127.0.0.1. Set PORT=<other> to use a different port.` | **PASS** | `07_port_occupied_handling: PASS` |
| 08 | Health endpoint | Windows 11 X64, `127.0.0.1:7026` | `GET /companion/health` | `200 OK`, `host: "127.0.0.1"`, `localOnly: true` | `200 OK`, `{"ok":true,"service":"subtitleme-local-companion","host":"127.0.0.1","localOnly":true,"registeredSubtitles":0}` | **PASS** | `08_health_endpoint: PASS` |
| 09 | Manifest endpoint | Windows 11 X64, `127.0.0.1:7026` | `GET /manifest.json` | `200 OK`, `version: "1.0.0-rc.2"` | `200 OK`, `version: "1.0.0-rc.2"` | **PASS** | `09_manifest_endpoint: PASS` |
| 10 | Configure endpoint | Windows 11 X64, `127.0.0.1:7026` | `GET /configure` | `200 OK` with 256-bit ephemeral session token | `200 OK`, 64-hex-char session token issued | **PASS** | `10_configure_endpoint: PASS` |
| 11 | Upload SRT | Windows 11 X64, `127.0.0.1:7026` | `POST /companion/subtitles` (`clean-pt.srt`, `tt1254207`) | `201 Created` | `201 Created` | **PASS** | `11_upload_srt: PASS` |
| 12 | Upload VTT | Windows 11 X64, `127.0.0.1:7026` | `POST /companion/subtitles` (`clean-en.vtt`, `tt1254207`) | `201 Created` | `201 Created` | **PASS** | `12_upload_vtt: PASS` |
| 13 | Combined bilingual subtitle generation | Windows 11 X64, `127.0.0.1:7026` | Request `/<config>/subtitles/movie/tt1254207.json` and fetch `/generated/<token>.vtt` | `200 OK` WebVTT containing both languages and UTF-8 accents | `200 OK`; both `áéíóúãõç — «SubtitleMe»` and `Clean install validation test.` present | **PASS** | `13_combined_bilingual_vtt: PASS` |
| 14 | Opt-in persistence | Windows 11 X64, isolated `SUBTITLEME_DATA_DIR` | `POST /companion/storage/consent` `{ enabled: true }` + upload 2 tracks | `200 OK` and files persisted to disk (`index.json` + 2 UUID tracks) | `200 OK`, `3` files written on disk | **PASS** | `14_persistence_opt_in: PASS` |
| 15 | Recovery after restart | Windows 11 X64, isolated `SUBTITLEME_DATA_DIR` | Plant `orphan.tmp.abcdef`, restart with `SUBTITLEME_PERSISTENCE=1`, query `/companion/storage` | `recoveredCount: 2`, `cleanedTempFiles: 1`, `corruptedSkippedCount: 0` | `recoveredCount: 2`, `cleanedTempFiles: 1`, `corruptedSkippedCount: 0` | **PASS** | `15_recovery_after_restart: PASS` |
| 16 | SIGTERM termination | Windows 11 X64, Node `v24.19.0` | Send `SIGTERM` to Companion subprocess | Process terminates cleanly without orphan `.tmp.*` files | Terminated cleanly (`signal: "SIGTERM"`), zero orphan `.tmp.*` | **PASS** | `16_sigterm_termination: PASS` |
| 17 | Zero workspace dependencies | Windows 11 X64, `os.tmpdir()` | Inspect extracted `package.json`, `node_modules/stremio-addon-sdk`, and verify path outside monorepo | No `workspace:*`, local `stremio-addon-sdk` present, outside monorepo | `outsideMonorepo: true`, `dependencies: { "stremio-addon-sdk": "^1.6.10" }`, zero `workspace:*` | **PASS** | `17_no_workspace_dependencies: PASS` |

> **Note on Windows `tar.exe` & Unicode**: Windows `bsdtar` (`tar.exe -C <unicode>`) uses the ANSI codepage for `-C`; extracting with the target Unicode directory as the working directory (`cwd`) succeeds cleanly.
> **Note on Stremio Desktop Visual Validation**: Visual playback inside Stremio Desktop (`v5.0.28`) was **not** executed in Sprint 15.2 and remains **PENDING** for the next visual validation round.
