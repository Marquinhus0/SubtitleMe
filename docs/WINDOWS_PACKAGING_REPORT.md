# SubtitleMe — Windows Packaging Report (Sprint 15.2)

**Component**: `@subtitleme/stremio-addon`  
**Previous RC (preserved)**: `1.0.0-rc.1` (`dist/release/subtitleme-stremio-v1.0.0-rc.1.tar.gz`, SHA-256 `8000c945caf0e21c9f4f167aeada96eba258d39830b59b0791dff8fda8caf385`)  
**New RC**: `1.0.0-rc.2` (`dist/release/subtitleme-stremio-v1.0.0-rc.2.tar.gz`)  
**Date**: 2026-11-23  

---

## 1. Phase 0 Diagnosis (Sprint 15.1 Packaging Blocker)

In Sprint 15.1, extracting `subtitleme-stremio-v1.0.0-rc.1.tar.gz` into an isolated Windows directory failed immediately at startup:

- `dist/index.mjs` imported `stremio-addon-sdk` externally (`import stremioSdk from "stremio-addon-sdk"`), which was not included in the tarball.
- The distributed `package.json` retained monorepo `"workspace:*"` specifiers (`@subtitleme/shared-types`, `@subtitleme/subtitle-core`, `@subtitleme/subtitle-parser`), preventing `npm install` from running outside the pnpm monorepo.

---

## 2. Architectural Decision

**Chosen Strategy**: **Standalone production package with vendored production `node_modules` and clean independent `package.json`** (`scripts/package-stremio-addon.mjs`).

### Rationale
- Internal monorepo packages (`@subtitleme/shared-types`, `@subtitleme/subtitle-core`, `@subtitleme/subtitle-parser`) remain bundled cleanly into `dist/index.mjs` (ESM, `node22` target) via Vite SSR build — eliminating all `workspace:*` runtime dependencies.
- `stremio-addon-sdk` (CommonJS, transitively depending on `express` and dynamic `require()` loaders) is **not** forced into an ESM bundle; instead, `scripts/package-stremio-addon.mjs` stages a clean standalone `package.json` (`dependencies: { "stremio-addon-sdk": "^1.6.10" }`) and runs `npm install --omit=dev --no-audit --no-fund --ignore-scripts` inside the isolated staging directory.
- Result: End users can extract the archive anywhere on Windows (with or without internet/pnpm) and run immediately, AND `package.json` is independently installable with zero `workspace:*` references.

---

## 3. Package Integrity (`1.0.0-rc.2`)

- **Artifact**: `dist/release/subtitleme-stremio-v1.0.0-rc.2.tar.gz`
- **Size**: `2,440,698` bytes (`5,628` files)
- **SHA-256**: `6e52ba59a7134901ac5b86669eec8c08310aaddd417b6efcbc5aa11465c6a71a`
- **Checksum file**: `dist/release/subtitleme-stremio-v1.0.0-rc.2.sha256`
- **Top-level contents**:
  - `package.json` (version `1.0.0-rc.2`, zero `workspace:*` references)
  - `dist/index.mjs` (`138.78 kB` ESM bundle)
  - `bin/start-companion.sh`
  - `bin/start-companion.ps1`
  - `bin/start-companion.cmd`
  - `node_modules/` (production-only `stremio-addon-sdk` + transitive runtime dependencies; zero devDependencies, zero `.env`/secrets/source maps)
- **Previous RC preserved**: `dist/release/subtitleme-stremio-v1.0.0-rc.1.tar.gz` untouched (`SHA-256: 8000c945caf0e21c9f4f167aeada96eba258d39830b59b0791dff8fda8caf385`).
