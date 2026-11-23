# Requirements

## Functional Requirements (v1.0.0)

1. **Dual Subtitle Display**: Display two independent subtitle tracks (primary and secondary) simultaneously on compatible HTML5 `<video>` players.
2. **Track Sources**:
   - Native HTML5 `TextTrack`s exposed by compatible players.
   - Local `.srt` and `.vtt` subtitle files imported via drag-and-drop or file picker.
3. **Independent Controls**:
   - Select different languages for primary and secondary tracks.
   - Toggle each track independently.
   - Adjust timing offset (in milliseconds) independently for each track.
4. **Customization**:
   - Font family, font size, primary color, secondary color, background opacity, text outline, text shadow, vertical position, and line spacing.
   - Live dual-subtitle preview reflecting changes immediately.
5. **Localization**:
   - Interface available in English (`en`) and Portuguese — Brazil (`pt-BR`).
6. **Persistence**:
   - Lightweight settings persisted in `chrome.storage.local`.
   - Imported local subtitle files persisted locally in IndexedDB with explicit removal controls.

## Non-Functional Requirements

- **Offline & Backend-Free**: Full functionality without accounts, subscriptions, external APIs, or remote servers.
- **Performance**: O(log n) binary search for active cue lookup; `requestAnimationFrame`-driven synchronization with zero redundant DOM updates when active cues have not changed.
- **Security & Privacy**: Least-privilege MV3 permissions, strict CSP, untrusted subtitle text escaping, zero telemetry.
- **Accessibility**: WCAG 2.2 AA contrast (`>= 4.5:1` across all dark surfaces), keyboard navigation, visible focus rings, ARIA switches and sliders, semantic form labels, 200% zoom responsiveness, and `prefers-reduced-motion` compliance.
- **Validated Persistence**: Runtime validation and bounds clamping for all user settings with safe fallback to `DEFAULT_SETTINGS` and resilient storage error handling.
- **Deterministic Subtitle Parsing**: Browser-independent `.srt` and `.vtt` parsing using integer milliseconds, UTF-8 BOM and LF/CRLF support, safe markup stripping, HTML entity decoding, overlap preservation, and structured diagnostic reporting without crashing on malformed inputs.
- **Isolated Multi-Player Dual Engine**: Independent per-video track management, O(log n) active cue lookup (`[start, end)`), boundary-union subtitle merging (SRT/VTT output for future Stremio reuse), rAF synchronization with pause/seek/rate handling, and Shadow DOM `textContent` rendering.
- **Local File Persistence & Preview**: Oversize-before-read validation (5 MB limit), content-verified `.srt`/`.vtt` parsing, UTF-8 / BOM / Windows-1252 encoding fallback, mandatory pre-save preview, duplicate `contentHash` prevention, IndexedDB storage of normalized cues, and explicit confirmation before destructive removals.
- **Browser & HTML5 Player Integration**: Debounced dynamic `<video>` detection and ranking, non-destructive native `TextTrack` observation, fullscreen container re-parenting, isolated multi-video sessions, and validated `activeTab` on-demand Popup messaging.
- **Strict TypeScript**: Strict compiler checks enabled across all workspaces.
