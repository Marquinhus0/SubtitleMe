# SubtitleMe — Stremio Companion Local Persistence & Security (`AUD-05`)

## 1. Overview & How to Enable

By default, the SubtitleMe Local Companion operates in **memory-only mode** (`SUBTITLEME_PERSISTENCE=0`, `enabled: false`, `encryptedAtRest: false`). Users may explicitly opt in to **encrypted local disk persistence** so settings, optional provider credentials, and uploaded `.srt`/`.vtt` subtitle files survive Companion restarts.

- **Default directory:** `~/.subtitleme/stremio-companion` (overridable via `SUBTITLEME_DATA_DIR`).
- **Opt-in activation:** Launch with `SUBTITLEME_PERSISTENCE=1` (e.g., `set SUBTITLEME_PERSISTENCE=1 && .\bin\start-companion.cmd` on Windows, or `SUBTITLEME_PERSISTENCE=1 ./bin/start-companion.sh` on Linux).
- **Cloud sync / Telemetry:** None. All data stays strictly on the local machine.

---

## 2. How Data at Rest Is Protected (`encryptedAtRest: true`)

When persistence is enabled and backed by the operating system's native credential vault:

1. **Master Key Management (`PersistenceKeyManager` + `KeyVault`):**
   - A 256-bit random master key (`crypto.randomBytes(32)`) is stored **exclusively in the OS native credential vault** under service `SubtitleMe.LocalCompanion` / account `MasterKey.v1`.
   - **No key is ever written alongside persisted data files**, embedded in source code, or logged.
   - The key is kept in process memory only while the Companion is running and zeroed (`Buffer.fill(0)`) on graceful shutdown (`close()`).
2. **Authenticated Encryption (`node:crypto` AES-256-GCM):**
   - All persisted files (`providers.enc.json`, `settings.enc.json`, `index.json`, and `<uuid>.(srt|vtt)`) are stored as versioned `subtitleme-enc-v1` envelopes encrypted with **AES-256-GCM**.
   - Every write generates a fresh **96-bit (12-byte) random IV/nonce**.
   - A **128-bit authentication tag** and **Additional Authenticated Data (AAD)** bound to each file's purpose (`providers`, `settings`, `index`, `subtitle:<id>`) are verified **before** any JSON parsing or data return, preventing tampering, truncation, and cross-file swapping.
3. **Filesystem Hardening:**
   - Controlled private directory (`0o700` on POSIX) and files (`0o600` on POSIX).
   - Kernel-enforced `O_NOFOLLOW` symlink refusal, directory containment (`assertPathInsideDir`), random UUID internal filenames, and atomic writes (`O_CREAT | O_EXCL | O_NOFOLLOW` temp file + `renameSync`).
   - Default storage quota: **50 MB** (`DEFAULT_MAX_PERSISTENCE_BYTES`).

```text
~/.subtitleme/stremio-companion/     (mode 0700 on POSIX; zero key material stored here)
├── providers.enc.json               (AES-256-GCM, purpose="providers", atomic write)
├── settings.enc.json                (AES-256-GCM, purpose="settings", atomic write)
├── index.json                       (AES-256-GCM, purpose="index", atomic write)
├── <random-uuid-1>.srt              (AES-256-GCM, purpose="subtitle:<id>", atomic write)
└── <random-uuid-2>.vtt              (AES-256-GCM, purpose="subtitle:<id>", atomic write)
```

---

## 3. Operating System Vault Support Matrix

| Operating System | Native Vault Backend | Validation Status |
| :--- | :--- | :--- |
| **Windows 11 X64** | **Windows Credential Manager** (`CredWriteW`/`CredReadW`/`CredDeleteW` via `advapi32.dll`, secret passed strictly via `stdin`, `shell: false`) | **Natively Validated** (real Credential Manager round-trip + full HTTP restart tests) |
| **Linux X64** | **Secret Service (`libsecret`)** via `secret-tool` (`stdin`, `shell: false`) | **Unit-tested with mocks** (native Linux desktop keyring validation pending; headless without keyring fails closed) |
| **macOS** | **macOS Keychain** via `/usr/bin/security` (`shell: false`) | **Not Tested** on macOS hardware |
| **Other OSes** | Unsupported (`UnsupportedOsKeyVault`) | **Fail-closed** (`VaultUnavailableError`) |

---

## 4. Fail-Closed Behavior (When the OS Vault Is Unavailable)

SubtitleMe **never falls back silently to plaintext storage**:
- If the OS credential vault is unavailable, locked, missing permissions, or running in a headless Linux environment without a Secret Service daemon, persistence throws `VaultUnavailableError` / `VaultPermissionError`.
- No plaintext files are written, and `encryptedAtRest` is **never** reported as `true` unless the OS vault is active and verified.

---

## 5. Safe Migration of Legacy Plaintext Files (`v1.0.0` / `v1.0.1`)

When starting with `SUBTITLEME_PERSISTENCE=1` and a working OS vault on a directory containing legacy plaintext files (`providers.json`, `settings.json`, `index.json` + plaintext `.srt`/`.vtt`):
1. The legacy file is read and validated without modifying it.
2. An encrypted replacement is written atomically (`.tmp.*` + `renameSync`).
3. The encrypted file is **re-read and decrypted** to verify integrity and exact content match.
4. **Only after verified decryption succeeds** is the legacy plaintext file removed.
5. If the process is interrupted or the OS vault is unavailable, original legacy files remain intact on disk.

---

## 6. How to Disable Persistence & Remove Persisted Data

- **Disable persistence:** Unset `SUBTITLEME_PERSISTENCE` (or set `SUBTITLEME_PERSISTENCE=0`) and restart the Companion. It returns to ephemeral memory-only mode (`encryptedAtRest: false`).
- **Delete all persisted data:**
  1. Stop the Companion (`Ctrl + C`).
  2. Delete `~/.subtitleme/stremio-companion` (Windows: `%USERPROFILE%\.subtitleme\stremio-companion`).
  3. Remove the master key from your OS vault:
     - **Windows:** Open *Control Panel → Credential Manager → Windows Credentials → Generic Credentials* and remove `SubtitleMe.LocalCompanion/MasterKey.v1`.
     - **Linux:** Run `secret-tool clear service SubtitleMe.LocalCompanion account MasterKey.v1`.
     - **macOS:** Remove `SubtitleMe.LocalCompanion` in *Keychain Access*.

---

## 7. Derived Cache, Limitations & Residual Risks

- Generated combined `.ass`/`.srt`/`.vtt` files are **never** persisted to disk; they remain strictly in the ephemeral in-memory `GeneratedSubtitleCache` (15-min TTL, 200 entries, 20 MB cap).
- **Residual risks (explicitly declared):** OS-backed encryption at rest protects against unauthorized file copies, backups, and other local user accounts, but **cannot** protect against malware running inside the same authenticated user session or full OS/administrator compromise.
