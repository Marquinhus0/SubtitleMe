# SubtitleMe Stremio Addon — Release Candidate `1.0.0-rc.1`

> **Controlled Local Distribution Only — NOT Published Publicly.**  
> Chrome Extension remains at `v1.0.0 RC` (unchanged and verified).

---

## 1. Release Summary

- **Package**: `@subtitleme/stremio-addon`
- **Version**: `1.0.0-rc.1` (synchronized across `apps/stremio-addon/package.json` and `manifest.json`)
- **Distribution Archive**: `dist/release/subtitleme-stremio-v1.0.0-rc.1.tar.gz` (36,570 bytes)
- **SHA-256**: `8000c945caf0e21c9f4f167aeada96eba258d39830b59b0791dff8fda8caf385`
- **GA Decision (Sprint 14)**: **`NO-GO` for `1.0.0` GA** — retained as `1.0.0-rc.1` pending human visual sign-off on Stremio Desktop (see [STREMIO_GA_READINESS.md](./STREMIO_GA_READINESS.md)).
- **Distribution Model**: Local-only (`127.0.0.1`), zero backend, zero telemetry, zero Docker requirement.

---

## 2. Changelog (Sprint 09 → Sprint 13)

- **Sprint 09**: Official Stremio protocol research, ADRs (`ADR-001`..`ADR-003`), initial `apps/stremio-addon` PoC.
- **Sprint 10**: Local Companion (`127.0.0.1`), 256-bit session auth, CSRF/Origin validation, `/configure` Modern Dark UI, `LocalFileSubtitleSource`, 192-bit opaque VTT tokens, session-scoped LRU cache, opt-in `OpenSubtitlesSourceProvider` contract.
- **Sprint 11**: Optional atomic local disk persistence (`CompanionPersistence`), DNS rebinding `Host` guard, session TTL, non-wildcard Companion CORS, `CompositeSubtitleSource` local-first fallback, port check & graceful shutdown (`SIGINT`/`SIGTERM`).
- **Sprint 12**: Native Node.js ESM bundle (`dist/index.mjs`), Linux (`start-companion.sh`) & Windows (`start-companion.ps1`) launchers, CJS interop fix for `stremio-addon-sdk`, symlink defense, orphan `.tmp.*` recovery, `POST /companion/session/revoke`, offline UI banner.
- **Sprint 13**: Kernel-enforced `O_NOFOLLOW`/`O_EXCL` TOCTOU-resistant file I/O, space-safe Windows PowerShell launcher hardening, 15-scenario external validation kit (`docs/validation/stremio-desktop/`), RC `1.0.0-rc.1` metadata & documentation closure.

---

## 3. Environment Requirements

- **Node.js**: `22.x` or newer
- **pnpm**: `9.x` or newer (for building from source)
- **Stremio Desktop**: installed on the same machine as the Companion

---

## 4. Installation, Uninstallation & Recovery

### Install & Start
```bash
pnpm install
pnpm build
./apps/stremio-addon/bin/start-companion.sh          # Linux
# .\apps\stremio-addon\bin\start-companion.ps1       # Windows PowerShell (Not Evaluated natively)
```
Open `http://127.0.0.1:7000/configure`, upload your `.srt`/`.vtt` pair, and paste the generated `http://127.0.0.1:7000/<config>/manifest.json` URL into Stremio Desktop.

### Uninstall
1. Remove **SubtitleMe** from Stremio Desktop (**Addons** → **Uninstall**).
2. Stop the Companion (`Ctrl+C`).
3. If you enabled optional local persistence, delete `~/.subtitleme/stremio-companion` (or click **Clear Entire Library** in `/configure` before stopping).

### Recovery Guide
- **Port 7000 occupied**: Run with `PORT=7001 ./apps/stremio-addon/bin/start-companion.sh`.
- **Session expired or revoked**: Reload `http://127.0.0.1:7000/configure` to receive a fresh 256-bit local session token.
- **Corrupted local index/temp files**: Restart the Companion — orphan `.tmp.*` files are cleaned automatically and corrupted entries are pruned safely without crashing.

---

## 5. Known Limitations (Honest Disclosure)

1. **Stremio Desktop visual player rendering**: **`Partially Tested`** — pending human visual sign-off on a graphical host ([STREMIO_DESKTOP_VALIDATION.md](./STREMIO_DESKTOP_VALIDATION.md)).
2. **Windows native execution**: **`Not Evaluated`** — static script review only ([STREMIO_WINDOWS_VALIDATION.md](./STREMIO_WINDOWS_VALIDATION.md)).
3. **macOS**: **`Not Evaluated`**.
4. **OpenSubtitles live API**: **`Partially Tested`** — official v1 contract verified with mocks; live key test pending ([STREMIO_EXTERNAL_VALIDATION.md](./STREMIO_EXTERNAL_VALIDATION.md)).
5. **No encryption at rest**: Optional disk persistence uses OS user-only permissions (`0o700`/`0o600` on POSIX).
6. **Loopback-only scope**: Stremio Web (HTTPS) and Android/TV are **`Unsupported`** for `http://127.0.0.1`.
