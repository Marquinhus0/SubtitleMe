# Installation Guide — SubtitleMe v1.0.0

SubtitleMe is distributed as a Google Chrome Manifest V3 extension.

> **Important:** A `.zip` extension package **cannot** be installed by double-clicking it. For manual/local installation, you must extract the archive first and load the extracted folder in Chrome Developer Mode. The `.zip` file itself is formatted for direct upload to the Chrome Web Store Developer Dashboard.

---

## 1. Minimum Requirements

- **Browser**: Google Chrome (Manifest V3 compatible; tested on Chromium `159.0.8154.6`)
- **Account / Internet**: Not required (100% local, zero backend)

## 2. Obtaining the Official Release Package

- Download `subtitleme-chrome-v1.0.0.zip` and `SHA256SUMS.txt` from the official release artifacts (or build locally via `pnpm build && pnpm package:release` into `dist/release/`).
- Optional integrity check (Linux/macOS):
  ```bash
  sha256sum -c SHA256SUMS.txt
  ```

## 3. Manual Installation (Developer Mode — Load Unpacked)

1. **Extract the ZIP archive** into a permanent folder on your computer (for example, `~/Extensions/subtitleme-v1.0.0/`). Confirm that `manifest.json` is located directly inside that folder.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the **extracted folder** containing `manifest.json` (do **not** select the `.zip` file or the repository root).
6. Confirm that **SubtitleMe v1.0.0** appears in your extensions list with no manifest errors.
7. *(Optional)* Click the puzzle-piece icon in the Chrome toolbar and pin **SubtitleMe** for one-click access.

## 4. Chrome Web Store Submission Package

- The file `dist/release/subtitleme-chrome-v1.0.0.zip` is ready for direct upload to the Chrome Web Store Developer Dashboard once reviewed and approved for publication.

## 5. Getting Started

1. **Open the Popup**: Click the SubtitleMe icon in the Chrome toolbar on any page with an HTML5 `<video>` player.
2. **Access Full Settings**: Click **Settings** in the popup header or **Open Full Settings** at the bottom.
3. **Import a Local Subtitle (`.srt` or `.vtt`)**:
   - Open **Settings → Local Files** (or click **Import File** in the Popup).
   - Drag and drop (or browse for) a `.srt` or `.vtt` file (max 5 MB).
   - Review the **Import Preview** (cue count, duration, sample lines, and any encoding warnings).
   - Select the subtitle language and click **Confirm & Save Locally**.
4. **Configure Two Languages**:
   - Choose your **Primary** and **Secondary** languages or imported files in the Popup or **Settings → Languages**.
   - Adjust font size, colors, position, and independent millisecond offsets in **Appearance** and **Synchronization**.

## 6. Troubleshooting Common Issues

| Symptom | Cause & Resolution |
| --- | --- |
| *"Restricted browser pages cannot be inspected"* | Chrome blocks extensions on `chrome://`, `about:`, and Chrome Web Store pages. Switch to a regular webpage with an HTML5 video. |
| *"No native text tracks exposed"* | Many players do not expose standard HTML5 `<track>` elements. Import your own `.srt` or `.vtt` files locally via **Local Files**. |
| Subtitles don't appear in fullscreen | Enter fullscreen using the player's wrapper/container fullscreen button rather than bare `<video>` fullscreen, as browsers disallow DOM overlays inside a bare `<video>` element. |
| Accented characters look garbled | SubtitleMe automatically falls back to Windows-1252 when UTF-8 fails and shows a warning. Convert exotic encodings to UTF-8 if needed. |

## 7. Updating or Removing SubtitleMe

- **Update (Unpacked)**: Extract the new version over the same folder and click the **Reload** icon on the SubtitleMe card in `chrome://extensions`. Your `chrome.storage.local` settings and IndexedDB subtitle library are preserved.
- **Remove**: Open `chrome://extensions`, locate **SubtitleMe**, and click **Remove**. To delete stored subtitle data beforehand, use **Settings → Privacy → Clear All Local Data**.
