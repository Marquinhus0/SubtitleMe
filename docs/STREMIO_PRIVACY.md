# SubtitleMe — Stremio Privacy & Security Model (Sprint 10)

## 1. Local Companion Security Controls

- **Exclusive Loopback Binding**: `assertLoopbackHost()` enforces `127.0.0.1` strictly and throws a security error if `0.0.0.0`, `::`, or any LAN/remote interface is requested.
- **Ephemeral Session Token**: A 256-bit random token (`randomBytes(32)`) is generated at server startup and verified using constant-time `timingSafeEqual()`. It is embedded in-memory into the same-origin `/configure` HTML page and never written to disk, cookies, or logs.
- **CSRF & Origin Protection**: All mutating Companion endpoints (`POST`, `DELETE`) require:
  1. Valid loopback `Origin` (`http://127.0.0.1:<port>` or `http://localhost:<port>`), blocking cross-origin websites.
  2. Valid `X-SubtitleMe-Token` header.
  3. Custom `X-SubtitleMe-CSRF: 1` header.
- **Strict File & Input Validation**:
  - Extensions restricted strictly to `.srt` and `.vtt`.
  - 5 MB per-file byte cap (HTTP `413` on overflow).
  - Real content inspection: rejects null bytes/binary payloads, HTML/script tags, and mismatched signatures (e.g., SRT disguised as VTT or vice versa).
  - Rejects path traversal (`../`), arbitrary file paths, remote URLs (`http://`, `file://`), and credential fields (`apiKey`, `password`, `token`) in upload payloads.
  - Files are never executed and full subtitle contents are never written to logs.

---

## 2. Cache & VTT Delivery Security Audit (Sprint 10 Upgrade)

During Sprint 10, `GeneratedSubtitleCache` and `SubtitleFileService` were audited and hardened:

| Risk Evaluated | Sprint 09 PoC | Sprint 10 Hardening |
| :--- | :--- | :--- |
| Predictable tokens | Deterministic 32-char SHA-256 | **192-bit opaque random hex tokens** (`randomBytes(24)`, 48 chars) |
| Cross-session mixing | Global token map | **Strict `sessionScope` isolation** + per-session fingerprint index |
| Stale VTT after file deletion | Persisted until TTL | **Immediate derived invalidation** (`invalidateBySourceId()`) on track removal/update |
| Shared proxy caching | `Cache-Control: public` | **`Cache-Control: private, no-store`** + `X-Content-Type-Options: nosniff` |
| Unbounded memory | 200 entries / 20 MB / 15 min TTL | Preserved strict **200 entries / 20 MB / 15 min TTL** + LRU eviction |

> Note: Opaque VTT tokens serve as unguessable delivery handles for the local player and are **not** treated as authentication credentials.

---

## 3. Privacy Guarantees

- **No telemetry or tracking**: Zero analytics, zero playback history logging.
- **Storage mode**: Memory-only by default; optional local disk persistence (`~/.subtitleme/stremio-companion`, OS user-only permissions `0o700`/`0o600`, not encrypted at rest) requires explicit user consent. See [STREMIO_PERSISTENCE.md](./STREMIO_PERSISTENCE.md).
- **DNS rebinding & CORS audit**: See [STREMIO_SECURITY_AUDIT.md](./STREMIO_SECURITY_AUDIT.md) for the full 19-point security review (Host header validation, session TTL expiration, and non-wildcard Companion CORS).
- **Zero credential persistence**: Optional OpenSubtitles API keys are never stored in subtitle records, cache entries, or logs.
- **Chrome Extension Independence**: `apps/chrome-extension` (v1.0.0 RC) remains 100% offline/local-first and does not share IndexedDB data with the Stremio Addon.
