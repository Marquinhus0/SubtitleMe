# SubtitleMe Stremio Addon — General Availability (GA) Readiness & Release Decision (Sprint 15)

## 1. Final Release Decision

**DECISION: `NO-GO` — Maintain `1.0.0-rc.1` (Mandatory Hold)**

### Why `NO-GO` Is Mandatory in Sprint 15

Per Sprint 15 release rules, **`NO-GO — Manter 1.0.0-rc.1` is mandatory whenever the bilingual experience has not yet been visually observed inside Stremio Desktop**:

- **RC Artifact Integrity Verified**: `dist/release/subtitleme-stremio-v1.0.0-rc.1.tar.gz` (`36,570` bytes) matches SHA-256 `8000c945caf0e21c9f4f167aeada96eba258d39830b59b0791dff8fda8caf385`.
- **Internal Engineering Gates**: All 9 mandatory internal criteria pass (`29/29` test files, `118/118` tests, native Linux launcher verified, 23-point security audit complete, Chrome Extension v1.0.0 RC E2E untouched and passing).
- **External Blocker Still Active**: This headless Linux VM has `stremio=none`, `os_key=none`, no native Windows host, and no human-submitted evidence yet in `docs/validation/stremio-desktop/`.

No version promotion to `1.0.0` was performed; `@subtitleme/stremio-addon` remains at **`1.0.0-rc.1`**.

---

## 2. Recommended GA Scope (Once Visual Validation Passes)

| Option | Requirements | Recommendation |
| :--- | :--- | :--- |
| **Option A — GA Linux (`1.0.0` Linux-first)** | Real Stremio Desktop visual validation on Linux + native Linux Companion verified (done) + security & tests (done) + Windows explicitly excluded + OpenSubtitles labeled **Experimental (opt-in, not live-validated)** | **RECOMMENDED** as fastest honest path to `1.0.0` GA (requires only 1 external human pass on Linux Desktop) |
| **Option B — GA Multiplataforma (Linux + Windows)** | Everything in Option A **plus** native Windows execution of `start-companion.ps1` (install, persistence, restart, delete, shutdown) | Defer until a native Windows host completes [STREMIO_WINDOWS_VALIDATION.md](./STREMIO_WINDOWS_VALIDATION.md) |

- **macOS**: Remains `Not Evaluated` (never claim support without native validation).
- **Stremio Web (HTTPS), Android, Android TV**: Remain `Unsupported` for `http://127.0.0.1` loopback architecture.

---

## 3. Mandatory Internal Criteria (9 / 9 PASS)

| # | Criterion | Status | Evidence |
| :--- | :--- | :--- | :--- |
| 1 | **Reproducible build & RC artifact** | **PASS** | `apps/stremio-addon/dist/index.mjs` (136.96 kB) & `dist/release/subtitleme-stremio-v1.0.0-rc.1.tar.gz` (SHA-256 verified) |
| 2 | **Automated tests approved** | **PASS** | `pnpm test`: **29/29 files, 118/118 tests PASS** (`0` removed, `0` regressions vs Sprint 14) |
| 3 | **Chrome Extension regression approved** | **PASS** | Zero edits to `apps/chrome-extension/`; `pnpm test:browser` PASS (`pageErrors=0`) |
| 4 | **Linux native execution validated** | **PASS** | Real subprocess test of `start-companion.sh` on `Linux 6.18.57` / `Node v22.23.5` with persistence & `SIGTERM` exit `0` |
| 5 | **Security audited** | **PASS** | 23-point audit in [STREMIO_SECURITY_AUDIT.md](./STREMIO_SECURITY_AUDIT.md) (DNS rebinding, session TTL/revocation, non-wildcard Companion CORS, `O_NOFOLLOW`/`O_EXCL` TOCTOU defense, `.tmp.*` recovery) |
| 6 | **Documentation complete** | **PASS** | Full architecture, setup, persistence, privacy, security, compatibility, validation kits, and RC docs |
| 7 | **Known limitations disclosed** | **PASS** | All platform, loopback, encryption-at-rest, and experimental boundaries documented |
| 8 | **Install, uninstall & recovery documented** | **PASS** | Complete guides in [STREMIO_RELEASE_CANDIDATE.md](./STREMIO_RELEASE_CANDIDATE.md) |
| 9 | **Zero unmitigated critical/high defects** | **PASS** | All runtime defects resolved with regression tests |

---

## 4. Human Validation Handoff (External Blocker to Unblock `1.0.0` GA)

- **What must be executed**: All 15 scenarios in [`docs/validation/stremio-desktop/results-template.json`](./validation/stremio-desktop/results-template.json) against `dist/release/subtitleme-stremio-v1.0.0-rc.1.tar.gz`.
- **Required environment**: A graphical **Linux Desktop** machine (for Option A GA Linux) — or both **Linux Desktop + Windows 10/11** (for Option B GA Multiplataforma) — with **Node.js 22+** and **Stremio Desktop** installed.
- **Required evidence artifacts**:
  1. Completed results file saved as `docs/validation/stremio-desktop/results-<os>-<date>.json` (OS, Stremio version, Node.js version, observed results).
  2. Real unedited screenshots `docs/validation/stremio-desktop/screenshots/scenario-01.png` through `scenario-15.png`.
  3. *(Optional for Option B)* Completed Windows checklist in [STREMIO_WINDOWS_VALIDATION.md](./STREMIO_WINDOWS_VALIDATION.md).
  4. *(Optional for live OpenSubtitles)* Controlled test log using a user-supplied `OPENSUBTITLES_API_KEY` (never committed).
- **Blocked decision**: Promotion of `@subtitleme/stremio-addon` from `1.0.0-rc.1` → `1.0.0` (`GO` / `CONDITIONAL GO`).
