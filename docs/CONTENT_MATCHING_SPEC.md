# SubtitleMe — Content Identification & Matching Specification (Sprint 15.4)

## 1. Supported Stremio ID Formats

Parsed by `parseStremioContentId()` (`apps/stremio-addon/src/discovery/content-identifier.ts`):

| Example Input (`type`, `id`) | Decoded `canonicalId` | `namespace` | `imdbId` | `season` / `episode` |
| :--- | :--- | :--- | :--- | :--- |
| `movie`, `tt1254207` | `tt1254207` | `imdb` | `tt1254207` | — |
| `series`, `tt0903747:1:2` | `tt0903747:1:2` | `imdb` | `tt0903747` | `1` / `2` |
| `series`, `tt0903747%3A1%3A2` | `tt0903747:1:2` | `imdb` | `tt0903747` | `1` / `2` |
| `movie`, `tmdb:10378` | `tmdb:10378` | `tmdb` | *(none)* | — |
| `series`, `tmdb:1396:1:2` | `tmdb:1396:1:2` | `tmdb` | *(none)* | `1` / `2` |
| `series`, `kitsu:7442:3` | `kitsu:7442:3` | `kitsu` | *(none)* | `1` / `3` |
| `movie`, `sm_poc_demo` | `sm_poc_demo` | `custom` | *(none)* | — |

---

## 2. Strict Matching Rules (`doesContentIdentityMatch` & `matchBilingualPair`)

1. **No Filename Proof**: `extra.filename` is auxiliary metadata only and is **never** accepted as proof of content identity.
2. **Movie vs Episode Isolation**: A movie candidate can **never** match a series episode request, and vice versa.
3. **Episode Coordinate Isolation**: Series episode `S01E02` (`tt0903747:1:2`) can **never** match `S01E01` (`tt0903747:1:1`) or `S01E03`.
4. **Confidence Gate**: Candidates with `confidence: 'low'` are rejected automatically (no silent low-confidence guessing).
5. **Local Priority**: `origin: 'local'` always outranks `origin: 'external'` for the same `(canonicalId, language)` — local subtitles are never silently overwritten.
6. **Completeness Requirement**: Both primary and secondary languages must have verified, distinct matches; if either is missing, SubtitleMe returns `{ subtitles: [] }` instead of serving a fake bilingual track or duplicating one language.
