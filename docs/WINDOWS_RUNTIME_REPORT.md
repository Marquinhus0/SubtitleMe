# SubtitleMe — Windows Runtime & Entrypoint Report (Sprint 15.2)

**Component**: `@subtitleme/stremio-addon` (`1.0.0-rc.2`)  
**Runtime Tested**: Node.js `v24.19.0` on Windows 11 (`NT 10.0.26300.0`, `X64`)  
**Date**: 2026-11-23  

---

## 1. Root Cause Found in Sprint 15.1

`apps/stremio-addon/src/index.ts` previously detected direct CLI execution via:

```ts
import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
```

When installed in any directory containing spaces (e.g., `C:\Users\First Last\SubtitleMe`), accented characters, or Unicode, `import.meta.url` percent-encodes characters (`%20`, `%C3%A7`, etc.) while `process.argv[1]` contains literal characters. As a result, `isDirectRun` evaluated to `false` and Node.js exited silently with code `0` without starting the HTTP server.

---

## 2. Remediation Implemented

Created `apps/stremio-addon/src/companion/entrypoint.ts` exporting `isDirectExecution(moduleUrl, argvEntry, platform)`:

- Converts `moduleUrl` via Node's `fileURLToPath()` (accurately decoding `%20`, Latin accents, and Unicode).
- Normalizes both paths via `path.resolve()` and `realpathSync()` (with safe fallback for synthetic unit-test paths).
- Applies case-insensitive comparison on `win32` to handle Windows drive-letter casing (`C:\` vs `c:\`).
- Returns `false` safely when `argvEntry` is `undefined`, empty, whitespace, or a different script (zero false positives on `import()`).
- Updated `apps/stremio-addon/src/index.ts` to validate `PORT` (`1..65535`), log the process `PID`, and attach a `.catch()` handler setting `process.exitCode = 1` on fatal startup errors (no silent exit `0`).

---

## 3. Verification Results

- **Unit & subprocess tests** (`apps/stremio-addon/tests/windows-entrypoint-launcher.test.ts`): **5/5 PASS**
  - Direct execution: standard path, spaces, accented (`usuário ação café`), Unicode (`日本語 テスト`), Windows drive-letter casing.
  - Module import (`import()`): does not auto-start server.
  - Missing/blank `argv[1]`: returns `false`.
  - Invalid `PORT`: exits with code `1` and explicit stderr diagnostic.
- **Clean-install runtime verification outside monorepo** (`1.0.0-rc.2` extracted to `os.tmpdir()`):
  - No-space directory (`clean-nospace`): **PASS** (`127.0.0.1:7021`, `200 OK`)
  - Space directory (`SubtitleMe Clean Space Dir`): **PASS** (`127.0.0.1:7022`, `200 OK`)
  - Accented + Unicode directory (`SubtitleMe Ação Café 日本語`): **PASS** (`127.0.0.1:7023`, `200 OK`)
  - Module `import()` of extracted `dist/index.mjs`: **PASS** (no auto-start, `version === "1.0.0-rc.2"`)
