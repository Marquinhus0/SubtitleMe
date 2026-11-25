# SubtitleMe — End-to-End Report (`1.0.0-rc.3`, Sprint 15.5)

| Pipeline Stage | Local HTTP / Node Verification | Real Stremio Desktop `5.0.28` |
| :--- | :--- | :--- |
| RC SHA-256 (`c1ab3cc...`) | **PASS** | N/A |
| Companion Startup (`start-companion.cmd`) | **PASS** (`127.0.0.1:7000`, PID `12512`) | N/A |
| Content ID Parsing (`tt1254207`, `tt0903747:1:1`, `sm_test_001`) | **PASS** | N/A |
| Local Discovery & Bilingual Matching | **PASS** (`pt-BR` + `en`) | N/A |
| SRT/VTT Parsing & Bilingual WebVTT Merge | **PASS** (`200 OK`, accents intact) | N/A |
| Stremio Addon Installation | **PASS** | **PASS** |
| Stremio Player Subtitle Picker & Rendering | N/A | **FAIL** (blocked by missing PNA header `Access-Control-Allow-Private-Network: true` & omitted `idPrefixes`) |
| OpenSubtitles REST API v1 | Mock-tested (Sprint 15.4) | **NOT TESTED LIVE** |
