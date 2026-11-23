# SubtitleMe — Stremio Addon Installation Guide (Local MVP)

## Overview

The SubtitleMe Stremio Addon MVP runs **locally on your computer** (`127.0.0.1` loopback only). No cloud account or remote server is required, and your SRT/VTT subtitle files stay in ephemeral local memory on your machine.

---

## Prerequisites

- Node.js 22+
- pnpm 9+
- Stremio Desktop installed on the **same machine** (recommended for local loopback)

---

## Step 1 — Start the Local Companion & Addon Server

From the repository root:

```bash
pnpm install
pnpm --filter @subtitleme/stremio-addon start
```

For Windows PowerShell instructions, optional local disk persistence (`SUBTITLEME_PERSISTENCE=1`), and graceful shutdown details, see [STREMIO_COMPANION_SETUP.md](./STREMIO_COMPANION_SETUP.md) and [STREMIO_PERSISTENCE.md](./STREMIO_PERSISTENCE.md).

By default, the server listens exclusively on loopback:

- **Configure & Companion UI**: `http://127.0.0.1:7000/configure`
- **Default Manifest URL**: `http://127.0.0.1:7000/manifest.json`
- **Health Check**: `http://127.0.0.1:7000/companion/health`

> The server refuses to bind to `0.0.0.0` or LAN IP addresses by design to protect your local subtitle files from network exposure.

---

## Step 2 — Upload Subtitles & Generate Your Install URL

1. Open `http://127.0.0.1:7000/configure` in your browser.
2. Confirm the header badge shows **Companion Active (127.0.0.1)**.
3. Enter the **Stremio Content ID** for your video (for example `tt1254207` for a movie, or `tt0903747:1:1` for a series episode).
4. Select your **Primary language** and upload its `.srt` or `.vtt` file (max 5 MB).
5. Select your **Secondary language** and upload its `.srt` or `.vtt` file (max 5 MB).
6. Adjust independent timing offsets (`-30000` to `+30000` ms) and display stacking order (`primary-top` or `secondary-top`).
7. Click **Generate Bilingual Preview** to confirm both languages merge cleanly.
8. Click **Generate Stremio Install URL** and copy the `http://127.0.0.1:7000/<config>/manifest.json` URL.

---

## Step 3 — Install in Stremio Desktop

1. Open **Stremio Desktop** on the same computer.
2. Navigate to **Addons** → **+ Add Addon**.
3. Paste the `http://127.0.0.1:7000/<config>/manifest.json` URL.
4. Click **Install**.
5. Start playing the movie or episode matching your Content ID and select **SubtitleMe — <Primary> + <Secondary>** in the subtitle picker.

---

## Platform Notes & Limitations

| Platform | Local `http://127.0.0.1` Support | Notes |
| :--- | :--- | :--- |
| **Stremio Desktop (Windows / macOS / Linux)** | Supported by protocol (same machine) | Recommended environment for Local Companion MVP. *Not visually verified in this headless Linux VM.* |
| **Stremio Web (HTTPS)** | Blocked by browser mixed-content policy on plain HTTP | `https://web.stremio.com` blocks `http://127.0.0.1` unless served via HTTPS or local Stremio Streaming Server. |
| **Stremio Android / Android TV / iOS** | Not supported for `127.0.0.1` | Mobile/TV devices cannot reach your computer's loopback address (`127.0.0.1`). |
