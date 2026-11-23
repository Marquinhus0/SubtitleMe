# SubtitleMe — Stremio Local Companion Security Audit (Sprint 11)

## 1. Threat Model

Because the SubtitleMe Local Companion exposes a local HTTP server on `127.0.0.1`, the primary security risks for local web-accessible daemons are:

1. **Network exposure** (`0.0.0.0` binding exposing local files to LAN).
2. **DNS rebinding** (remote domain resolving to `127.0.0.1` to read `/configure` or invoke Companion APIs).
3. **Cross-Site Request Forgery (CSRF)** & permissive CORS from malicious browser tabs.
4. **Arbitrary file read/write / path traversal** via client-supplied filenames or `contentId`.
5. **Malformed / spoofed / oversized uploads** (DoS or executable/HTML injection).
6. **Cache leakage & stale access** across sessions or after file deletion.

---

## 2. 19-Point Security Verification Matrix

| # | Control | Implementation | Status |
| :--- | :--- | :--- | :--- |
| 1 | **Loopback binding** | `assertLoopbackHost()` strictly enforces `127.0.0.1` and throws on `0.0.0.0`, `::`, or LAN IPs | **PASS** |
| 2 | **Host header validation** | `CompanionAuth.validateHostHeader()` verifies exact `127.0.0.1:<port>` or `localhost:<port>` | **PASS** |
| 3 | **DNS rebinding protection** | Applied to `/configure`, `/`, and ALL `/companion/*` routes (returns `403`) | **PASS** |
| 4 | **Origin validation** | Rejects non-loopback `Origin` headers with `403` | **PASS** |
| 5 | **CSRF protection** | Mutating routes (`POST`, `DELETE`) require `X-SubtitleMe-CSRF: 1` + valid session token | **PASS** |
| 6 | **CORS separation** | Wildcard `*` restricted ONLY to Stremio protocol (`/manifest.json`, `/subtitles/...`, `/health`) and `/generated/:token.vtt`; **NEVER** applied to `/companion/*` | **PASS** |
| 7 | **OPTIONS preflight** | `/companion/*` preflight rejects foreign origins with `403` and omits `Access-Control-Allow-Origin` | **PASS** |
| 8 | **Session tokens** | 256-bit `randomBytes(32)` verified with constant-time `timingSafeEqual()` | **PASS** |
| 9 | **Session expiration** | Bounded TTL (`DEFAULT_SESSION_TTL_MS = 12h`); expired tokens rejected with `401`; `/configure` rotates cleanly | **PASS** |
| 10 | **Unauthenticated requests** | Rejected with `401` on all protected Companion endpoints | **PASS** |
| 11 | **Cross-session access** | `GeneratedSubtitleCache` isolates entries by `sessionScope`; cross-session token lookup returns `null` | **PASS** |
| 12 | **Malformed uploads** | Rejected with `400` (invalid JSON, zero cues, mismatched SRT/VTT signature) | **PASS** |
| 13 | **Size limits** | 5 MB per subtitle file (`413`), 7 MB JSON envelope cap, 50 MB default disk persistence quota | **PASS** |
| 14 | **Path traversal** | Blocked in `validateSubtitleFilename()`, `validateContentId()`, and `assertPathInsideDir()` | **PASS** |
| 15 | **Content injection** | Rejects null bytes/binary payloads and `<script>` / `<html>` / `<iframe>` markup | **PASS** |
| 16 | **Arbitrary URLs** | Rejects `url`, `filePath`, `path`, `apiKey`, `password`, `token` fields in uploads | **PASS** |
| 17 | **External file access** | Companion never opens arbitrary client paths; disk persistence writes only random UUID files inside `dataDir` | **PASS** |
| 18 | **Cache security** | 192-bit opaque random VTT tokens, 200 entries / 20 MB / 15 min TTL, LRU eviction, `Cache-Control: private, no-store`, immediate `invalidateBySourceId()` | **PASS** |
| 19 | **Resource cleanup** | Graceful `SIGINT`/`SIGTERM` shutdown closes HTTP server and clears ephemeral VTT cache | **PASS** |
| 20 | **Symlink & TOCTOU defense** | `readFileNoFollow()` (`O_RDONLY \| O_NOFOLLOW` + `fstatSync(fd).isFile()`) and `writeFileAtomic()` (`O_CREAT \| O_EXCL \| O_NOFOLLOW`) prevent kernel-level symlink races | **PASS** |
| 21 | **Interrupted-write recovery** | `cleanupOrphanTempFiles()` automatically removes leftover `*.tmp.*` files on startup without corrupting `index.json` | **PASS** |
| 22 | **Explicit session revocation** | `POST /companion/session/revoke` rejects foreign Origins (`403`), spoofed Hosts (`403`), missing CSRF (`403`), and invalid tokens (`401`); valid calls immediately rotate to a fresh 256-bit token | **PASS** |
| 23 | **Error message sanitization** | HTTP JSON errors never leak raw stack traces, session tokens, or API keys | **PASS** |

---

## 3. Residual Risks & Known Security Boundaries (Documented Honestly)

- **No encryption at rest**: Optional local disk persistence stores subtitle files in plaintext inside the user's private profile directory (`0o700` dir / `0o600` files on POSIX). No encryption-at-rest is claimed.
- **Same-machine trust**: Any local process running under the same OS user account can access `127.0.0.1` and the user's `~/.subtitleme/stremio-companion` directory.
- **Windows `O_NOFOLLOW` platform difference**: `O_NOFOLLOW` is a POSIX kernel flag (`0` on Windows); on Windows, reparse-point/symlink defense falls back to `lstatSync` + `assertPathInsideDir`, which carries a narrow TOCTOU window under concurrent same-user local writes.
- **Passing tests do not prove zero vulnerabilities**: Future changes to HTTP routes, parsers, or third-party dependencies (`stremio-addon-sdk`) require re-auditing Origin, Host, and CORS boundaries.
