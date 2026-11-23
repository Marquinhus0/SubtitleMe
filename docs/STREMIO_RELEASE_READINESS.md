# SubtitleMe — Stremio Addon Release Readiness (Sprint 12)

## 1. Executive Readiness Status

- **Addon Version**: `@subtitleme/stremio-addon` `v0.3.0-mvp`
- **Chrome Extension Version**: `v1.0.0 RC` (preserved untouched, E2E regression green)
- **Overall Stremio Release Status**: **Local Beta Ready (Pending Human Visual Confirmation on Stremio Desktop)**
- **Public Addon Publication**: **Not published** (intentional per Sprint 12 scope; local loopback distribution only)

---

## 2. Verification Summary Matrix

| Area | Status | Evidence |
| :--- | :--- | :--- |
| **Local Companion Protocol & HTTP E2E (Linux)** | **Tested** | Automated E2E + native `start-companion.sh` subprocess test (`SIGTERM` graceful exit) |
| **Optional Local Persistence & Crash Recovery** | **Tested** | Atomic writes, restart recovery, corrupted index/file pruning, orphan `.tmp.*` cleanup, symlink rejection, 50 MB quota |
| **Companion Security & Cache Hardening** | **Tested** | Loopback-only, DNS rebinding (`Host`), Origin, CSRF, CORS separation, 256-bit TTL token, `POST /companion/session/revoke`, 192-bit opaque VTT tokens, session isolation, immediate `invalidateBySourceId()` |
| **Source Selection & Fallback Policy** | **Tested** | `CompositeSubtitleSource` local-first priority, opt-in fallback, zero silent overwrite |
| **Stremio Desktop Visual Rendering** | **Partially Tested** | Protocol & WebVTT edge cases verified; **visual player check pending on graphical host** (see [STREMIO_DESKTOP_VALIDATION.md](./STREMIO_DESKTOP_VALIDATION.md)) |
| **OpenSubtitles REST API v1 (Opt-in)** | **Partially Tested** | Official v1 contract verified via mocks; **live key test pending** (`OPENSUBTITLES_API_KEY` not present in VM) |
| **Windows Native Execution** | **Not Evaluated** | `start-companion.ps1` provided and statically checked; not executed on native Windows |
| **macOS Native Execution** | **Not Evaluated** | Out of Sprint 12 mandatory scope; no macOS host available |
| **Chrome Extension v1.0.0 RC Regression** | **Tested** | Zero changes to `apps/chrome-extension/`; `typecheck`, `lint`, `test`, `build`, and real Chromium E2E all PASS |

---

## 3. Residual Risks & Known Limitations

1. **Unverified visual rendering in Stremio Desktop**: Must be confirmed manually on a graphical machine before removing the `Partially Tested` label.
2. **Unverified live OpenSubtitles quota/auth**: Real API key validation has not yet run against `api.opensubtitles.com`.
3. **No encryption-at-rest for persisted subtitles**: Optional disk persistence relies on OS user-only directory/file permissions (`0o700`/`0o600` on POSIX).
4. **Loopback-only reachability**: `http://127.0.0.1` is restricted to Stremio Desktop on the same machine; Stremio Web (HTTPS) blocks mixed-content and Android/TV devices cannot reach `127.0.0.1`.
5. **Windows PowerShell execution policy**: Users on Windows may need `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` to run `start-companion.ps1`.
