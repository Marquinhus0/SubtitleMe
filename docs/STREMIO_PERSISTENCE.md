# SubtitleMe — Stremio Companion Local Persistence

## 1. Overview

By default, the SubtitleMe Local Companion operates in **memory-only mode** (`enabled: false`). Users may explicitly opt in to **local disk persistence** so uploaded `.srt` and `.vtt` subtitle files survive Companion restarts.

- **Default directory**: `~/.subtitleme/stremio-companion` (overridable via `SUBTITLEME_DATA_DIR`).
- **Opt-in activation**: Toggle **Enable optional local disk persistence** in `http://127.0.0.1:7000/configure` or launch with `SUBTITLEME_PERSISTENCE=1`.
- **Cloud sync**: None. All data stays strictly on the local machine.

---

## 2. Storage Layout

```text
~/.subtitleme/stremio-companion/     (mode 0700 on POSIX)
├── index.json                       (mode 0600, atomic write via temp + rename)
├── <random-uuid-1>.srt              (mode 0600, atomic write)
└── <random-uuid-2>.vtt              (mode 0600, atomic write)
```

- **Random internal filenames**: Client-supplied filenames are stored **only as display metadata** in `index.json` and are **never** used as filesystem paths.
- **Atomic writes**: Every subtitle file and `index.json` is written to `<target>.tmp.<random>` and atomically renamed into place, preventing partial writes on abrupt termination.
- **Quota**: Default storage cap is **50 MB** (`DEFAULT_MAX_PERSISTENCE_BYTES`), configurable via `maxStorageBytes`.

---

## 3. Recovery & Corruption Handling

On startup with persistence enabled:
1. `CompanionPersistence.loadAll()` reads `index.json`.
2. If `index.json` is missing, startup proceeds cleanly with 0 tracks.
3. If `index.json` is malformed JSON or has an invalid schema, it is safely ignored without crashing.
4. Each entry's `contentId`, `language`, `filename`, internal UUID path (`assertPathInsideDir()`), byte size (<= 5 MB), and subtitle syntax (`parseSubtitle()`) are re-validated.
5. Corrupted or missing files are skipped and pruned cleanly; valid tracks rebuild the in-memory `CompanionSubtitleStore` index and report `recoveredCount` in `/configure`.

---

## 4. Derived Cache & Deletion Semantics

- Generated combined WebVTT files are **never** persisted to disk; they remain strictly in the ephemeral in-memory `GeneratedSubtitleCache` (15-min TTL, 200 entries, 20 MB cap).
- Deleting a single track (`DELETE /companion/subtitles/:id`) or clearing the entire library (`DELETE /companion/subtitles`) removes the file(s) from memory and disk and immediately invokes `cache.invalidateBySourceId(id)`, causing previously issued `/generated/:token.vtt` URLs to return `404 Not Found`.

---

## 5. Encryption Notice

Local disk persistence uses OS user-only permissions (`0o700` / `0o600` on POSIX) and does **not** implement encryption-at-rest.
