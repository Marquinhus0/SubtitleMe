# ADR-003: Single Combined WebVTT Track Delivery via Bounded TTL HTTP Cache

- **Status**: Accepted (Sprint 09)
- **Context**: Stremio players select a single active subtitle track at a time and do not reliably support rendering two simultaneous native subtitle tracks.
- **Decision**: Reuse `@subtitleme/subtitle-parser` and `@subtitleme/subtitle-core` (`mergeSubtitleTracks` + `serializeSubtitleCues('vtt')`) to produce a single chronological WebVTT file containing both languages separated by line breaks, with independent offsets and configurable stacking order. Serve the generated `.vtt` at `/generated/<sha256-token>.vtt` (`Content-Type: text/vtt; charset=utf-8`, `Access-Control-Allow-Origin: *`) backed by `GeneratedSubtitleCache` (bounded 200 entries / 20 MB / 15-minute TTL). Identify the track in Stremio using ISO 639-2 `lang` (primary language) plus explicit `label: "SubtitleMe — <Primary> + <Secondary>"`.
- **Alternatives Discarded**:
  - *Returning two separate subtitle items*: Stremio only renders one track at a time, defeating dual-subtitle viewing.
  - *Unbounded disk/database persistence of generated VTTs*: Unnecessary storage growth and privacy risk.
  - *Reimplementing parser/merger inside `apps/stremio-addon`*: Violates monorepo DRY architecture.
- **Consequences**: Works on every Stremio client that supports standard WebVTT subtitles, reuses 100% of SubtitleMe's tested core engine, and keeps memory usage strictly bounded.
