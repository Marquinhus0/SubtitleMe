# SubtitleMe — Stremio Visual Validation Report (`1.0.0-rc.3`, Sprint 15.5)

**Release Candidate**: `1.0.0-rc.3`  
**SHA-256**: `c1ab3cc45a6911226ab126bd04abeab137d9dbad06ebd0fcb3e61f53e896290d`  
**OS**: Windows 11 (`NT 10.0.26300.0`, `X64`) | **Node.js**: `v24.19.0` | **Stremio Desktop**: `5.0.28`  
**Final Decision**: **`REJECTED`** (GA remains **`NO-GO`**)

---

## 1. Summary of Verified Phases (Phases 0–5)
- **Phase 0 (RC Integrity)**: **PASS** — SHA-256 matched (`c1ab3cc45a6911226ab126bd04abeab137d9dbad06ebd0fcb3e61f53e896290d`), `2,520,436` bytes, `5,616` files extracted outside monorepo.
- **Phase 1 (Windows Companion)**: **PASS** — Launched via `bin\start-companion.cmd` on `127.0.0.1:7000` (PID `12512`), `netstat` confirmed loopback-only.
- **Phase 2 (Local Controlled Persistence)**: **PASS** — Persistence OFF (`1 -> 0` after restart) and Persistence ON (`6 -> 6` recovered after restart) both verified.
- **Phase 3 & 4 (Content ID, Discovery, Matching & Merge)**: **PASS (HTTP)** — Verified `tt1254207` (movie), `tt0903747:1:1` (episode), and `sm_test_001` (alt catalog) returning valid merged bilingual WebVTT (`200 OK`).
- **Phase 5 (Stremio Desktop `5.0.28` Installation)**: **PASS** — Addon installed cleanly in Stremio Desktop `5.0.28`.

---

## 2. Phase 6 Failure in Real Player (`tt1254207` Big Buck Bunny)
Even with `tt1254207` (`pt-BR` + `en`) persisted in the live Companion (`registeredSubtitles: 4`), **no SubtitleMe subtitle track appeared in the Stremio Desktop `5.0.28` video player**.

### Root Cause Identified
1. **Missing Chromium Private Network Access (PNA) Header (`Access-Control-Allow-Private-Network: true`)**: Stremio 5 (`stremio-shell-ng.exe`) loads its UI from `https://web.stremio.com` inside Chromium WebView2. Fetching `http://127.0.0.1:7000/<config>/subtitles/...` triggers a Chromium PNA `OPTIONS` preflight requiring `Access-Control-Allow-Private-Network: true`, which `routes.ts` did not emit.
2. **Removed `idPrefixes` in `1.0.0-rc.3` Manifest**: `manifest.ts` omitted `idPrefixes: ['tt', 'sm_']`.
3. **OpenSubtitles API v1 UX**: `OpenSubtitlesDiscoveryProvider` (`https://api.opensubtitles.com/api/v1`) was implemented in `rc.3` but only configurable via CLI env vars (`OPENSUBTITLES_ENABLED=1` + `OPENSUBTITLES_API_KEY`), with no UI configuration in `/configure`.

Per Sprint 15.5 restrictions, `1.0.0-rc.3` was **not** modified during validation; Sprint 15.5 is closed as **`REJECTED`** to produce `1.0.0-rc.4`.
