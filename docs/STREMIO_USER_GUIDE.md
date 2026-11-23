# SubtitleMe — Stremio Addon User Guide

## Two Languages. One Experience.

SubtitleMe combines two subtitle tracks (`.srt` or `.vtt`) into a **single bilingual WebVTT track** that Stremio's native player can display directly.

> **Privacy Notice:** All files uploaded in Local Companion mode are validated, parsed, merged, and served exclusively from `127.0.0.1` in ephemeral memory. Nothing is sent to third-party servers. The Chrome Extension and Stremio Addon operate independently and do **not** automatically share browser IndexedDB files.

---

## Workflow: Combining Two Local Subtitles

1. **Start SubtitleMe Companion** (`pnpm --filter @subtitleme/stremio-addon dev`) and open `http://127.0.0.1:7000/configure`.
2. **Verify Status**: Check that the top-right badge reads **Companion Active (127.0.0.1)**.
3. **Associate Content Explicitly**:
   - Enter the Stremio/IMDb Content ID (e.g. `tt1254207` for movies, `tt0903747:1:1` for series episodes) or an explicit user-defined ID.
   - SubtitleMe **never** matches solely by filename so subtitles from different movies or episodes are never mixed accidentally.
4. **Upload Primary & Secondary Tracks**:
   - Supported formats: `.srt` and `.vtt` (up to **5 MB** per file).
   - Files are inspected for real subtitle syntax and parsed immediately; invalid or spoofed files are rejected.
   - Uploading a new file for the same `(Content ID, Language)` safely replaces the previous track and invalidates any previously generated combined VTT.
5. **Tune Timing & Stacking Order**:
   - Adjust **Primary** and **Secondary** offsets independently (`-30000 ms` to `+30000 ms`).
   - Choose **Primary on top** or **Secondary on top**.
6. **Preview Before Watching**:
   - Click **Generate Bilingual Preview** to inspect merged timestamps and dual-language lines before launching Stremio.
7. **Remove Files or Clear Library Anytime**:
   - Click **Remove** next to any track (or **Clear Entire Library**) and confirm the prompt. Files are removed from memory and local disk (if persistence is enabled) and derived combined VTT URLs are invalidated immediately (`404 Not Found`).
8. **Optional Local Persistence**:
   - Toggle **Enable optional local disk persistence** in `/configure` if you want uploaded subtitles to be automatically recovered after restarting the Companion (stored locally without encryption-at-rest; see [STREMIO_PERSISTENCE.md](./STREMIO_PERSISTENCE.md)).

---

## Controlled Behavior When Only One Track Exists

If only the primary OR only the secondary subtitle is uploaded for a given Content ID, SubtitleMe returns an empty list (`{ subtitles: [] }`) instead of silently serving a mislabeled single-language track as bilingual.

---

## Optional External Source (OpenSubtitles REST API v1 — Opt-in)

SubtitleMe includes an optional, disabled-by-default `OpenSubtitlesSourceProvider` implementing the official OpenSubtitles REST API v1 (`GET /api/v1/subtitles`, `POST /api/v1/download`):

- **Strictly opt-in**: No external requests are made unless explicitly enabled with your own OpenSubtitles `Api-Key`.
- **No scraping**: Uses only official documented REST endpoints and headers (`Api-Key`, `User-Agent`).
- **No credential persistence**: Your API key is never logged or stored inside subtitle records or the VTT cache.
- **No local file upload**: Your local `.srt`/`.vtt` files are never uploaded to OpenSubtitles.
