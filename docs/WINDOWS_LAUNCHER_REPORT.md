# SubtitleMe — Windows Launcher Report (Sprint 15.2)

**Component**: `@subtitleme/stremio-addon` (`1.0.0-rc.2`)  
**Files**: `apps/stremio-addon/bin/start-companion.ps1`, `apps/stremio-addon/bin/start-companion.cmd`  
**Date**: 2026-11-23  

---

## 1. Windows ExecutionPolicy Behavior

On default Windows installations, `Get-ExecutionPolicy -List` shows all scopes as `Undefined` (effective policy: `Restricted`). Running `.\bin\start-companion.ps1` directly is blocked by Windows with `PSSecurityException (UnauthorizedAccess)`.

**Security Rule Honored**: SubtitleMe **never** modifies global or user `ExecutionPolicy` (`Set-ExecutionPolicy` is never invoked) and **never** attempts to bypass corporate/administrative GPO restrictions.

---

## 2. Launcher Improvements Implemented

1. **Added native Windows Command Prompt launcher (`bin/start-companion.cmd`)**:
   - Works out-of-the-box on default Windows with zero PowerShell `ExecutionPolicy` friction.
   - Enables UTF-8 codepage (`chcp 65001 >nul 2>&1`) for accented/Unicode paths.
   - Quotes all paths (`"%DIST_ENTRY%"`), validates `node` in `PATH` and major version `>= 22`, defaults `PORT=7000`, and propagates exact `%ERRORLEVEL%`.
2. **Hardened PowerShell launcher (`bin/start-companion.ps1`)**:
   - Documents default `ExecutionPolicy` behavior and safe alternatives (`.\bin\start-companion.cmd`, `node .\dist\index.mjs`, or process-scoped `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\bin\start-companion.ps1"` when permitted by local policy).
   - Uses `-LiteralPath` on all `Test-Path` and `Resolve-Path` calls for spaces/Unicode safety.
   - Safely guards `$RepoRoot` resolution so standalone installs at shallow paths (e.g. `C:\SubtitleMe`) do not fail.
   - Validates `Node.js 22+` and numeric `PORT` (`1..65535`), prints launcher `PID`, and propagates `$LASTEXITCODE` without swallowing errors.

---

## 3. Native Windows Validation Results

Tested directly from the extracted `1.0.0-rc.2` archive in a directory containing spaces (`SubtitleMe Clean Space Dir`) outside the monorepo:

- `cmd.exe /c bin\start-companion.cmd` (default Windows, no policy change): **PASS** (`http://127.0.0.1:7025/companion/health` → `200 OK`)
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File bin\start-companion.ps1` (process-scoped): **PASS** (`http://127.0.0.1:7024/companion/health` → `200 OK`)
- Global `ExecutionPolicy`: Verified unchanged (all scopes remain `Undefined`).
