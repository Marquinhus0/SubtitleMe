# SubtitleMe — Windows Native Validation Guide (Sprint 13)

## 1. Current Status

- **Windows Native Execution Status**: **`Not Evaluated`**
- **Static Script Audit Status**: **Reviewed & Hardened** ([`apps/stremio-addon/bin/start-companion.ps1`](../apps/stremio-addon/bin/start-companion.ps1))

> No Windows environment is available in this Linux VM. Native execution was **not** simulated.

---

## 2. Static Audit Improvements Applied in Sprint 13

During Sprint 13, `start-companion.ps1` was audited specifically for Windows edge cases:
- **PathInfo resolution**: Changed `Resolve-Path` assignments to `(Resolve-Path ...).Path` so string paths are passed cleanly to `node` and `pnpm`.
- **Paths with spaces**: Added explicit quoting (`"$DistEntry"`, `"$RepoRoot"`) and `-LiteralPath` on `Test-Path` calls so installation directories containing spaces (e.g., `C:\Users\First Last\SubtitleMe`) do not break argument parsing.
- **Node.js 22+ check**: Fails fast with an actionable message when `node` is missing or below v22.
- **Loopback-only guarantee**: Never binds to `0.0.0.0` and never installs a Windows background service.

---

## 3. Manual Windows Validation Checklist

Execute in **Windows PowerShell** on a native Windows 10/11 machine (preferably inside a directory path containing a space, e.g., `C:\Users\Test User\SubtitleMe`):

| # | Check | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| 1 | `pnpm install` & `pnpm build` | `apps\stremio-addon\dist\index.mjs` created cleanly | Not Evaluated |
| 2 | `.\apps\stremio-addon\bin\start-companion.ps1` | Starts on `http://127.0.0.1:7000` with no path/quoting errors | Not Evaluated |
| 3 | Port-already-in-use check | Clear error message suggesting `$env:PORT` override | Not Evaluated |
| 4 | `GET /companion/health` & `/manifest.json` | Both return `200 OK` on `127.0.0.1` | Not Evaluated |
| 5 | Upload `.srt` & `.vtt` in `/configure` | Validated, parsed, and listed | Not Evaluated |
| 6 | Enable persistence (`$env:SUBTITLEME_PERSISTENCE="1"`), restart | Tracks recovered from `%USERPROFILE%\.subtitleme\stremio-companion` | Not Evaluated |
| 7 | Individual delete & Clear Entire Library | Files removed from disk and derived VTT returns `404` | Not Evaluated |
| 8 | `Ctrl+C` shutdown | Graceful exit without orphan `.tmp.*` files | Not Evaluated |
