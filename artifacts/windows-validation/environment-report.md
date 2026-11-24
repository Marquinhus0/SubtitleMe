# SubtitleMe — Windows Environment Report (Sprint 15.1)

**Date**: 2026-11-23  
**Target Release Candidate**: `@subtitleme/stremio-addon@1.0.0-rc.1`  
**Git Commit**: `da81115` (clean working tree)

---

## 1. Operating System & Architecture

- **OS Version**: Microsoft Windows NT 10.0.26300.0 (Windows 11)
- **Architecture**: `X64`

---

## 2. Node.js & Package Managers

| Tool | Status | Version / Details |
| :--- | :--- | :--- |
| `node` | Installed (compatible, >= 22) | `v24.19.0` |
| `npm` | Installed (`npm.cmd`) | `11.17.0` (`npm.ps1` blocked by default PowerShell ExecutionPolicy) |
| `pnpm` | Not installed | `pnpm` / `pnpm.cmd` not found in `PATH` |

---

## 3. PowerShell ExecutionPolicy

Executed `Get-ExecutionPolicy -List`:

| Scope | ExecutionPolicy |
| :--- | :--- |
| `MachinePolicy` | `Undefined` |
| `UserPolicy` | `Undefined` |
| `Process` | `Undefined` |
| `CurrentUser` | `Undefined` |
| `LocalMachine` | `Undefined` |

> **Finding**: On Windows PowerShell, when all scopes are `Undefined`, the effective policy defaults to `Restricted`. Running `.ps1` scripts directly (such as `npm.ps1` or `.\bin\start-companion.ps1`) is blocked by `PSSecurityException (UnauthorizedAccess)` unless invoked via an explicit per-process policy or via `node dist/index.mjs` directly. Global `ExecutionPolicy` was **not** modified.

---

## 4. Stremio Desktop Installation

- **Running Process at Inspection**: None (`Get-Process *stremio*` returned no active processes)
- **Installation Path**: `%LOCALAPPDATA%\Programs\Stremio`
- **Binaries Detected**:
  - `stremio-shell-ng.exe` — ProductVersion / FileVersion: **`5.0.28`** (Stremio 5 Desktop)
  - `stremio-runtime.exe` — ProductVersion / FileVersion: `18.12.1`
  - `ffmpeg.exe` / `ffprobe.exe` — Bundled media tools

---

## 5. Repository & Artifact Paths

- **Project Root**: `e:\SubtitleMe\SubtitleMe`
- **Addon Package Directory**: `apps\stremio-addon`
- **Release Candidate Artifact**: `dist\release\subtitleme-stremio-v1.0.0-rc.1.tar.gz` (36,570 bytes)
- **Validation Docs**:
  - `docs\STREMIO_DESKTOP_VALIDATION.md`
  - `docs\STREMIO_WINDOWS_VALIDATION.md`
  - `docs\STREMIO_INSTALLATION.md`
  - `docs\STREMIO_SECURITY_AUDIT.md`
  - `docs\validation\stremio-desktop\results-template.json`
- **Startup Scripts (in repo & RC)**:
  - `bin/start-companion.ps1`
  - `bin/start-companion.sh`

---

## 6. Environment Variables

- `OPENSUBTITLES_API_KEY`: **Not set** (`False`)
