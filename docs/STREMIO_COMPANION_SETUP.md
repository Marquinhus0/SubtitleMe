# SubtitleMe — Local Companion Setup & Lifecycle Guide

## 1. Distribution Decision

Among the evaluated distribution options (Node.js start script, standalone compiled binary, Docker), the **Node.js start script** was selected for Sprint 11 because it provides:

- **Lowest operational complexity** with direct access to local files via browser upload at `http://127.0.0.1:7000/configure`.
- **Zero Docker requirement** (Docker is not required to import local SRT/VTT files).
- **No silent background daemon**: The Companion starts only when explicitly invoked by the user and shuts down cleanly on `SIGINT` / `SIGTERM`.

---

## 2. Running on Linux (Tested)

Prerequisites: Node.js 22+ and pnpm 9+.

```bash
pnpm install
./apps/stremio-addon/bin/start-companion.sh
```

With optional local disk persistence enabled:

```bash
SUBTITLEME_PERSISTENCE=1 PORT=7000 ./apps/stremio-addon/bin/start-companion.sh
```

Press `Ctrl+C` (`SIGINT`) for graceful shutdown (closes the HTTP server and clears ephemeral VTT cache).

---

## 3. Running on Windows (PowerShell — `Not Evaluated` Natively)

Prerequisites: Node.js 22+ and pnpm 9+.

```powershell
pnpm install
.\apps\stremio-addon\bin\start-companion.ps1
```

With optional local disk persistence and custom port:

```powershell
$env:SUBTITLEME_PERSISTENCE="1"
$env:PORT="7000"
.\apps\stremio-addon\bin\start-companion.ps1
```

> Note: `start-companion.ps1` has been statically verified for Node.js 22+ checks and loopback-only binding, but native execution on Windows was not performed in this Linux VM (`Not Evaluated`).

---

## 4. macOS

`Not Evaluated` — no macOS environment is available in this workspace.

---

## 5. Lifecycle & Troubleshooting

- **Port already in use**: Before binding, `checkPortAvailable(port, '127.0.0.1')` probes the port and prints a clear diagnostic message (`Port 7000 is already in use on 127.0.0.1. Set PORT=<other> to use a different port.`).
- **Manual Desktop Validation Checklist (for Graphical Hosts)**:
  1. Start Companion (`pnpm --filter @subtitleme/stremio-addon start`).
  2. Open `http://127.0.0.1:7000/configure` and confirm **Companion Active (127.0.0.1)** and **Stremio Manifest Ready**.
  3. Upload primary (`.srt`) and secondary (`.vtt`) files for a test movie ID (e.g. `tt1254207`).
  4. Generate the Stremio install URL and paste it in **Stremio Desktop** → **Addons** → **+ Add Addon**.
  5. Play the matching title, select **SubtitleMe — <Primary> + <Secondary>**, and verify dual-line display, Portuguese accents, stacking order, and offsets.
