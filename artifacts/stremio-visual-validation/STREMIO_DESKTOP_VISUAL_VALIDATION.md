# SubtitleMe — Stremio Desktop Real-World Visual Validation (Sprint 15.3)

**Product**: SubtitleMe (`@subtitleme/stremio-addon`)  
**Release Candidate Tested**: `1.0.0-rc.2` (extracted outside monorepo)  
**RC SHA-256**: `6e52ba59a7134901ac5b86669eec8c08310aaddd417b6efcbc5aa11465c6a71a`  
**OS**: Windows 11 (`NT 10.0.26300.0`, `X64`)  
**Node.js**: `v24.19.0`  
**Stremio Desktop**: `5.0.28` (`stremio-shell-ng.exe`)  
**Final Sprint 15.3 Decision**: **`REJECTED`** (GA remains **`NO-GO`**)

---

## 1. Executive Summary

- **Phase 0 & 1 (Integrity & Companion Launch)**: **PASS** — `1.0.0-rc.2` SHA-256 matched; extracted outside the monorepo to `%TEMP%\subtitleme-rc2-visual-validation`; launched cleanly via `bin\start-companion.cmd` on `127.0.0.1:7000` (PID `25416`, verified loopback-only via `netstat -ano`).
- **Phase 2 (Test Fixtures)**: **PASS** — Original legal bilingual fixtures (`bbb-primary-pt-BR.srt`, `bbb-secondary-en.vtt`, `sintel-primary-pt-BR.srt`, `sintel-secondary-en.vtt`) created and hashed.
- **Phase 3 (Addon Installation in Stremio Desktop `5.0.28`)**: **PASS** — User successfully installed SubtitleMe via Stremio Desktop's official **Addons → + Add Addon** flow.
- **Phase 4 & 5 (Player Visual & Stability Validation)**: **FAIL / BLOCKED** — During playback in Stremio Desktop `5.0.28`, **no SubtitleMe subtitles or subtitle options appeared in the player**.

---

## 2. Failure Investigation (Phase 6)

When the user reported that subtitles did not appear in Stremio Desktop `5.0.28`, live diagnostics against `http://127.0.0.1:7000` revealed:

1. **Classification**: **`Content association` + `Subtitle resource` + `Companion lifecycle` (local-only architecture limitation)**.
2. **Observed State**:
   - `GET /companion/health` returned `{"ok":true,"service":"subtitleme-local-companion","host":"127.0.0.1","localOnly":true,"registeredSubtitles":0}`.
   - `GET /<config>/subtitles/movie/tt1254207.json` returned `200 OK` with `{"subtitles":[]}`.
   - `1.0.0-rc.2` only serves subtitles for `contentId`s manually uploaded into `/configure` (in-memory by default); it does **not** connect to OpenSubtitles v3 or any automatic external subtitle source.
3. **Code Integrity**: Per Sprint 15.3 rules, **no silent code changes were made** to `1.0.0-rc.2`.

---

## 3. Screenshots & Evidence

- `artifacts/stremio-visual-validation/screenshots/` contains **0 screenshots** (no artificial screenshots generated).
- Real-world user feedback confirmed addon installation succeeded, but bilingual subtitle playback in Stremio Desktop `5.0.28` was **not achieved**.

---

## 4. Technical Conclusion & Next Steps

**Decision**: **`REJECTED`** (does not meet Acceptance Criteria 5–10; GA remains **`NO-GO`**).

To unblock real-world Stremio Desktop usage before a future `1.0.0-rc.3`:
1. Evaluate and implement an optional/automatic subtitle provider (such as **OpenSubtitles v3** or configurable OpenSubtitles REST API v1 in CLI startup) so users can get bilingual subtitles on any Stremio title without manual per-video `.srt`/`.vtt` upload.
2. Re-run Sprint 15.3 visual & stability validation with real screenshots (`scenario-01.png`..`scenario-15.png`).
