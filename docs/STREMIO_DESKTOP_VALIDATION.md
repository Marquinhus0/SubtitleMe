# SubtitleMe — Stremio Desktop Visual Validation Checklist (Sprint 12)

## 1. Environment Metadata Recorded in Sprint 12

- **Host OS**: `Linux 6.18.57 (NixOS x86_64)` — headless remote VM
- **Node.js**: `v22.23.5`
- **pnpm**: `12.21.0`
- **Addon Version**: `@subtitleme/stremio-addon` `1.0.0-rc.1`
- **Stremio Desktop Binary**: **Not installed (`stremio=none`)**
- **Current Visual Validation Status**: **`Partially Tested`** (HTTP/Protocol verified; visual player verification requires a human-operated graphical host with Stremio Desktop installed)
- **External Validation Kit**: [`docs/validation/stremio-desktop/results-template.json`](./validation/stremio-desktop/results-template.json) and [`docs/validation/stremio-desktop/README.md`](./validation/stremio-desktop/README.md) (contains full `preconditions`, `procedure`, `expected`, `observed`, `evidence`, and `status` fields for all 15 scenarios).

> **Integrity Notice**: No visual player results were simulated. All 15 scenarios below must be executed on a graphical Desktop machine to promote Stremio Desktop from `Partially Tested` to `Tested`.

---

## 2. Reproducible Human Validation Procedure

### Prerequisites
- Desktop computer running **Linux** or **Windows** with a graphical display
- **Node.js 22+** and **pnpm 9+**
- **Stremio Desktop** installed locally
- Two sample subtitle files (`.srt` and `.vtt`) in two languages (e.g., English and Portuguese with accents)

### Launch Command
- **Linux**: `./apps/stremio-addon/bin/start-companion.sh`
- **Windows (PowerShell)**: `.\apps\stremio-addon\bin\start-companion.ps1`

---

## 3. 15-Scenario Validation Matrix

| # | Scenario | Protocol/HTTP Status (VM) | Visual Player Status (Desktop) | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Addon installation via `http://127.0.0.1:7000/<config>/manifest.json` | Tested | Pending Human Check | Addon appears in Stremio Addons list |
| 2 | Manifest recognition (`id`, `resources: ["subtitles"]`, `config`) | Tested | Pending Human Check | Stremio displays "SubtitleMe" cleanly |
| 3 | Subtitle availability in player picker | Tested | Pending Human Check | `SubtitleMe — <Primary> + <Secondary>` listed |
| 4 | Selecting the bilingual track | Tested | Pending Human Check | Player fetches `/generated/<opaqueToken>.vtt` (`200 OK`) |
| 5 | Simultaneous dual-language rendering | Tested (VTT) | Pending Human Check | Both languages visible together, readable without CSS |
| 6 | Vertical stacking order (`primary-top` vs `secondary-top`) | Tested (VTT) | Pending Human Check | Top/bottom language order matches config |
| 7 | Independent primary/secondary offsets (`-30000` to `+30000` ms) | Tested (VTT) | Pending Human Check | Timestamps shift independently per track |
| 8 | Simultaneous cues | Tested (VTT) | Pending Human Check | Clean two-line display without duplication |
| 9 | Partially overlapping cues | Tested (VTT) | Pending Human Check | Smooth segment transitions without flicker |
| 10 | Multiline cues | Tested (VTT) | Pending Human Check | Line breaks preserved without clipping |
| 11 | Portuguese accents & special characters (`áéíóúãõç—«»`) | Tested (VTT) | Pending Human Check | UTF-8 characters render without mojibake |
| 12 | Switching between two different videos | Tested | Pending Human Check | Each `contentId` loads only its own pair |
| 13 | Only one local subtitle uploaded for a `contentId` | Tested | Pending Human Check | Addon returns `{ subtitles: [] }` cleanly |
| 14 | No matching subtitles for a `contentId` | Tested | Pending Human Check | Addon returns `{ subtitles: [] }` without error |
| 15 | Deleting a subtitle in `/configure` | Tested | Pending Human Check | Previously generated VTT URL immediately returns `404` |
