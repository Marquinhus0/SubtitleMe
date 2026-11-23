# SubtitleMe — Stremio Compatibility Matrix (Sprint 11)

## 1. Platform Compatibility Matrix

Status definitions:
- **Tested**: Verified end-to-end in the target runtime environment.
- **Partially Tested**: Protocol/HTTP layer verified; real player UI/visual rendering not yet verified in that environment.
- **Unsupported**: Architecturally incompatible with `127.0.0.1` loopback-only delivery.
- **Not Evaluated**: No runtime environment available to test.

| Platform | Status | Evidence & Environment Notes |
| :--- | :--- | :--- |
| **Local HTTP Addon + Companion Protocol (`127.0.0.1`, Linux)** | **Tested** | Full automated HTTP E2E verified (Manifest, `/configure`, Companion upload/persistence/restart, Stremio SDK `subtitles` handler, opaque WebVTT delivery, delete invalidation, DNS rebinding & CORS isolation). |
| **Local Companion Launcher (`start-companion.sh`, Linux)** | **Tested** | Executed as real subprocess on Linux (`Node v22.23.5`): loopback health, manifest, persistence, and `SIGTERM` graceful exit code `0`. |
| **Local Companion Launcher (`start-companion.ps1`, Windows)** | **Not Evaluated** | Statically verified only; native Windows runtime not available in this Linux VM. |
| **macOS** | **Not Evaluated** | Out of Sprint 12 mandatory scope; no macOS host available. |
| **Stremio Desktop (Linux / Windows / macOS)** | **Partially Tested** | Protocol & WebVTT payload generation verified via HTTP tests; **visual rendering inside Stremio Desktop player was NOT tested** (`stremio=none`). See [STREMIO_DESKTOP_VALIDATION.md](./STREMIO_DESKTOP_VALIDATION.md). |
| **Stremio Web (`https://web.stremio.com`)** | **Unsupported** (plain HTTP loopback) | HTTPS pages block `http://127.0.0.1` requests under browser mixed-content rules unless fronted by HTTPS or Stremio's local streaming server. |
| **Android** | **Unsupported** (for `127.0.0.1`) | External mobile devices cannot reach a desktop host's `127.0.0.1` loopback interface. |
| **Android TV** | **Unsupported** (for `127.0.0.1`) | External TV devices cannot reach a desktop host's `127.0.0.1` loopback interface. |
| **Other Devices (iOS, Smart TVs, Consoles)** | **Not Evaluated** | Not evaluated; `127.0.0.1` loopback is host-local only. |
| **OpenSubtitles REST API v1 (Opt-in)** | **Partially Tested** | Official v1 contract verified with deterministic mocked HTTP tests; **live network execution was NOT tested** because no authorized `OPENSUBTITLES_API_KEY` is provisioned in this VM. |

---

## 2. WebVTT Rendering Compatibility Notes

- SubtitleMe outputs **clean, standards-compliant plain-text WebVTT** with explicit newline separation (`Primary\nSecondary` or `Secondary\nPrimary`) and **no dependency on CSS `::cue` or advanced `<c>` styling**.
- Protocol-level tests in `apps/stremio-addon/tests/vtt-rendering-edge-cases.test.ts` verified: simultaneous cues, partially overlapping cues, primary-top vs secondary-top, independent offsets, multiline cues, Portuguese diacritics & special characters (`áéíóúãõç—«»`), and empty intervals.
- Results from HTTP/WebVTT tests are **not** transferred as visual player confirmation; visual verification on Stremio Desktop remains required on a graphical host.
