import { DEFAULT_ADDON_CONFIG, STREMIO_SUPPORTED_LANGUAGES } from '../config/addon-config';

export interface ConfigurePageOptions {
  readonly baseUrl: string;
  readonly sessionToken: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders the lightweight Modern Dark local configuration & Companion UI
 * served directly from `127.0.0.1` at `/configure`.
 *
 * Security & UX notes:
 * - Embeds the ephemeral loopback session token in-memory only (no cookies/localStorage).
 * - Sends `X-SubtitleMe-Token` and `X-SubtitleMe-CSRF: 1` on all mutating requests.
 * - Shows local persistence status, storage quota, recovery indicator, and requires explicit
 *   confirmation before destructive actions (Remove / Clear All Library).
 * - Explicitly informs the user that local disk persistence is NOT encrypted at rest and
 *   that Chrome Extension & Stremio do not automatically share IndexedDB files.
 */
export function renderConfigurePage(options: ConfigurePageOptions): string {
  const safeBaseUrl = escapeHtml(options.baseUrl);
  const safeToken = escapeHtml(options.sessionToken);

  const primaryOptionsHtml = STREMIO_SUPPORTED_LANGUAGES.map(
    (lang) =>
      `<option value="${escapeHtml(lang.bcp47)}"${
        lang.bcp47 === DEFAULT_ADDON_CONFIG.primaryLanguage ? ' selected' : ''
      }>${escapeHtml(lang.label)} (${escapeHtml(lang.bcp47)})</option>`,
  ).join('\n');

  const secondaryOptionsHtml = STREMIO_SUPPORTED_LANGUAGES.map(
    (lang) =>
      `<option value="${escapeHtml(lang.bcp47)}"${
        lang.bcp47 === DEFAULT_ADDON_CONFIG.secondaryLanguage ? ' selected' : ''
      }>${escapeHtml(lang.label)} (${escapeHtml(lang.bcp47)})</option>`,
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="subtitleme-token" content="${safeToken}" />
  <title>SubtitleMe — Stremio Local Companion</title>
  <style>
    :root {
      --bg: #0B0D12;
      --surface: #151923;
      --surface-elevated: #1C2230;
      --primary: #8B7CFF;
      --secondary: #36CFC9;
      --text: #F4F5FA;
      --muted: #A9B0C3;
      --border: #262E40;
      --danger: #FF5C77;
      --success: #36CFC9;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 28px 20px 64px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    h1 { margin: 0; font-size: 1.65rem; letter-spacing: -0.02em; }
    .tagline { color: var(--muted); font-size: 0.92rem; margin-top: 2px; }
    .badges { display: flex; gap: 10px; flex-wrap: wrap; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      font-size: 0.84rem;
      font-weight: 600;
    }
    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--muted);
    }
    .dot.ok { background: var(--success); }
    .dot.err { background: var(--danger); }
    .notice {
      background: rgba(139, 124, 255, 0.1);
      border: 1px solid rgba(139, 124, 255, 0.35);
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 0.88rem;
      color: var(--text);
      margin-bottom: 20px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 16px;
    }
    .card h2 {
      margin: 0 0 12px;
      font-size: 1.05rem;
      color: var(--text);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .card-header h2 { margin: 0; }
    label {
      display: block;
      font-size: 0.84rem;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      color: var(--text);
      margin-bottom: 10px;
      cursor: pointer;
    }
    input[type="text"], input[type="number"], select, input[type="file"] {
      width: 100%;
      padding: 9px 11px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface-elevated);
      color: var(--text);
      font-size: 0.92rem;
      margin-bottom: 12px;
    }
    button {
      background: var(--primary);
      color: #0B0D12;
      font-weight: 700;
      border: none;
      border-radius: 8px;
      padding: 10px 14px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    button.secondary {
      background: var(--surface-elevated);
      color: var(--text);
      border: 1px solid var(--border);
    }
    button.danger {
      background: transparent;
      color: var(--danger);
      border: 1px solid rgba(255, 92, 119, 0.45);
      padding: 6px 11px;
      font-size: 0.82rem;
    }
    .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .status-msg { font-size: 0.85rem; margin-top: 8px; min-height: 1.2em; color: var(--secondary); }
    .status-msg.error { color: var(--danger); }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
      margin: 12px 0;
    }
    .metric {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
    }
    .metric-label { font-size: 0.76rem; color: var(--muted); }
    .metric-val { font-size: 0.98rem; font-weight: 700; margin-top: 2px; }
    .preview-stage {
      background: #07090D;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
      min-height: 110px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 10px;
      justify-content: center;
    }
    .cue-box {
      background: rgba(11, 13, 18, 0.88);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      white-space: pre-line;
      font-size: 0.95rem;
    }
    .cue-time { font-size: 0.75rem; color: var(--muted); margin-bottom: 4px; }
    .track-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    .track-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.86rem;
    }
    .url-box {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.82rem;
      word-break: break-all;
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      margin: 8px 0;
    }
    .hint { font-size: 0.8rem; color: var(--muted); }
  </style>
</head>
<body>
  <main class="container">
    <header>
      <div>
        <h1>SubtitleMe — Stremio Local Companion</h1>
        <div class="tagline">Two languages. One experience.</div>
      </div>
      <div class="badges">
        <div class="badge" id="companion-status" aria-live="polite">
          <span class="dot" id="status-dot"></span>
          <span id="status-text">Checking Companion...</span>
        </div>
        <div class="badge" id="stremio-status" aria-live="polite">
          <span class="dot" id="stremio-dot"></span>
          <span id="stremio-text">Checking Manifest...</span>
        </div>
      </div>
    </header>

    <section class="notice" role="note">
      <strong>100% Local Processing:</strong> Your SRT and VTT subtitle files stay exclusively on <code>127.0.0.1</code> and are never uploaded to external servers.
      The Chrome Extension and Stremio Addon operate independently and do <strong>not</strong> automatically share browser IndexedDB files.
    </section>

    <section class="notice" id="offline-banner" role="alert" style="display:none; border-color: rgba(255,92,119,0.55); background: rgba(255,92,119,0.12);">
      <strong>Companion Offline:</strong> Could not reach <code>127.0.0.1</code>. Start the Local Companion using <code>./apps/stremio-addon/bin/start-companion.sh</code> (Linux) or <code>.\\apps\\stremio-addon\\bin\\start-companion.ps1</code> (Windows), then reload this page.
    </section>

    <section class="card" id="storage-card">
      <div class="card-header">
        <h2>Local Persistence &amp; Storage</h2>
        <button type="button" class="danger" id="clear-library-btn">Clear Entire Library</button>
      </div>
      <label class="checkbox-row">
        <input type="checkbox" id="persistence-toggle" />
        <span>Enable optional local disk persistence (keep uploaded subtitles after Companion restart)</span>
      </label>
      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Persistence Mode</div>
          <div class="metric-val" id="storage-mode">Memory only</div>
        </div>
        <div class="metric">
          <div class="metric-label">Disk Used</div>
          <div class="metric-val" id="storage-used">0 KB</div>
        </div>
        <div class="metric">
          <div class="metric-label">Files Stored</div>
          <div class="metric-val" id="storage-count">0</div>
        </div>
        <div class="metric">
          <div class="metric-label">Recovered on Restart</div>
          <div class="metric-val" id="storage-recovered">0</div>
        </div>
      </div>
      <div class="hint" id="storage-dir">Storage directory: controlled private app folder</div>
      <div class="hint">
        Notice: When enabled, files are saved locally in your user profile with OS user-only permissions (not encrypted at rest). No cloud sync is performed.
      </div>
      <div class="status-msg" id="storage-status" aria-live="polite"></div>
    </section>

    <section class="card">
      <h2>1. Content Association</h2>
      <label for="content-id">Stremio Content ID (e.g., <code>tt1254207</code> or <code>tt0903747:1:1</code>) or explicit user identifier</label>
      <input type="text" id="content-id" value="tt1254207" placeholder="tt1254207" autocomplete="off" />
      <p class="hint">Subtitles are matched strictly by this explicit Content ID — never solely by filename.</p>
    </section>

    <div class="grid">
      <section class="card">
        <h2>2. Primary Subtitle</h2>
        <label for="primary-lang">Primary language</label>
        <select id="primary-lang">${primaryOptionsHtml}</select>
        <label for="primary-file">Import SRT or VTT file (max 5 MB)</label>
        <input type="file" id="primary-file" accept=".srt,.vtt" />
        <label for="primary-offset">Primary timing offset (ms, -30000 to +30000)</label>
        <input type="number" id="primary-offset" min="-30000" max="30000" step="50" value="0" />
        <button type="button" id="upload-primary-btn">Save Primary Subtitle</button>
        <div class="status-msg" id="primary-status" aria-live="polite"></div>
      </section>

      <section class="card">
        <h2>3. Secondary Subtitle</h2>
        <label for="secondary-lang">Secondary language</label>
        <select id="secondary-lang">${secondaryOptionsHtml}</select>
        <label for="secondary-file">Import SRT or VTT file (max 5 MB)</label>
        <input type="file" id="secondary-file" accept=".srt,.vtt" />
        <label for="secondary-offset">Secondary timing offset (ms, -30000 to +30000)</label>
        <input type="number" id="secondary-offset" min="-30000" max="30000" step="50" value="0" />
        <button type="button" id="upload-secondary-btn">Save Secondary Subtitle</button>
        <div class="status-msg" id="secondary-status" aria-live="polite"></div>
      </section>
    </div>

    <section class="card">
      <h2>4. Display Order &amp; Bilingual Preview</h2>
      <div class="row" style="margin-bottom: 12px;">
        <div style="flex: 1; min-width: 220px;">
          <label for="order-select">Subtitle stacking order</label>
          <select id="order-select">
            <option value="primary-top" selected>Primary on top / Secondary below</option>
            <option value="secondary-top">Secondary on top / Primary below</option>
          </select>
        </div>
        <div style="align-self: flex-end; margin-bottom: 12px;">
          <button type="button" id="preview-btn">Generate Bilingual Preview</button>
        </div>
      </div>
      <div class="preview-stage" id="preview-stage" aria-live="polite">
        <span class="hint">Upload both primary and secondary subtitles for the same Content ID, then click "Generate Bilingual Preview".</span>
      </div>
    </section>

    <section class="card">
      <h2>5. Registered Local Subtitles</h2>
      <ul class="track-list" id="track-list">
        <li class="hint">No local subtitles uploaded yet.</li>
      </ul>
    </section>

    <section class="card">
      <h2>6. Install in Stremio (Local Loopback)</h2>
      <div class="row" style="margin-bottom: 10px;">
        <button type="button" id="generate-url-btn">Generate Stremio Install URL</button>
        <button type="button" class="secondary" id="copy-url-btn">Copy Manifest URL</button>
      </div>
      <div class="url-box" id="http-manifest-url">${safeBaseUrl}/manifest.json</div>
      <div class="url-box" id="stremio-deep-link">${safeBaseUrl.replace(/^http:\/\//i, 'stremio://')}/manifest.json</div>
      <div class="status-msg" id="install-status" aria-live="polite"></div>
      <ol class="hint">
        <li>Open <strong>Stremio Desktop</strong> on this same machine.</li>
        <li>Go to <strong>Addons</strong> &rarr; <strong>+ Add Addon</strong>.</li>
        <li>Paste the <code>http://127.0.0.1:...</code> manifest URL above and confirm installation.</li>
        <li>Play the video matching your Content ID and select <strong>SubtitleMe</strong> in the subtitle picker.</li>
      </ol>
      <p class="hint">
        <strong>Compatibility Note:</strong> Loopback URLs (<code>http://127.0.0.1</code>) are intended for <strong>Stremio Desktop</strong> on this computer. Stremio Web (HTTPS) blocks plain HTTP loopback and Android/TV devices cannot reach <code>127.0.0.1</code>.
      </p>
    </section>
  </main>

  <script>
    (function () {
      const tokenMeta = document.querySelector('meta[name="subtitleme-token"]');
      const sessionToken = tokenMeta ? tokenMeta.getAttribute('content') || '' : '';

      function authHeaders(isMutation) {
        const headers = { 'X-SubtitleMe-Token': sessionToken };
        if (isMutation) {
          headers['Content-Type'] = 'application/json';
          headers['X-SubtitleMe-CSRF'] = '1';
        }
        return headers;
      }

      function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      }

      async function checkHealth() {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        const offlineBanner = document.getElementById('offline-banner');
        try {
          const res = await fetch('/companion/health');
          const data = await res.json();
          if (res.ok && data.ok) {
            dot.className = 'dot ok';
            text.textContent = 'Companion Active (127.0.0.1) — ' + data.registeredSubtitles + ' track(s)';
            if (offlineBanner) offlineBanner.style.display = 'none';
          } else {
            dot.className = 'dot err';
            text.textContent = 'Companion Unavailable';
            if (offlineBanner) offlineBanner.style.display = 'block';
          }
        } catch {
          dot.className = 'dot err';
          text.textContent = 'Companion Offline';
          if (offlineBanner) offlineBanner.style.display = 'block';
        }
      }

      async function checkManifestReady() {
        const dot = document.getElementById('stremio-dot');
        const text = document.getElementById('stremio-text');
        try {
          const res = await fetch('/manifest.json');
          if (res.ok) {
            dot.className = 'dot ok';
            text.textContent = 'Stremio Manifest Ready';
          } else {
            dot.className = 'dot err';
            text.textContent = 'Manifest Error';
          }
        } catch {
          dot.className = 'dot err';
          text.textContent = 'Manifest Unreachable';
        }
      }

      async function refreshStorage() {
        const res = await fetch('/companion/storage', { headers: authHeaders(false) });
        if (!res.ok) return;
        const data = await res.json();
        const s = data.storage;
        if (!s) return;
        document.getElementById('persistence-toggle').checked = Boolean(s.enabled);
        document.getElementById('storage-mode').textContent = s.enabled ? 'Local Disk (Opt-in)' : 'Memory only';
        document.getElementById('storage-used').textContent = formatBytes(s.usedBytes) + ' / ' + formatBytes(s.maxBytes);
        document.getElementById('storage-count').textContent = String(s.trackCount);
        document.getElementById('storage-recovered').textContent = String(s.recoveredCount);
        document.getElementById('storage-dir').textContent = 'Storage directory: ' + s.dataDir;
      }

      async function refreshList() {
        const listEl = document.getElementById('track-list');
        const res = await fetch('/companion/subtitles', { headers: authHeaders(false) });
        if (!res.ok) return;
        const data = await res.json();
        listEl.innerHTML = '';
        if (!data.subtitles || data.subtitles.length === 0) {
          const empty = document.createElement('li');
          empty.className = 'hint';
          empty.textContent = 'No local subtitles uploaded yet.';
          listEl.appendChild(empty);
          return;
        }
        for (const item of data.subtitles) {
          const li = document.createElement('li');
          li.className = 'track-item';
          const info = document.createElement('div');
          info.textContent = item.contentId + ' • ' + item.language + ' • ' + item.filename + ' (' + item.cueCount + ' cues)';
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'danger';
          delBtn.textContent = 'Remove';
          delBtn.addEventListener('click', async () => {
            if (!window.confirm('Remove subtitle "' + item.filename + '" (' + item.contentId + ')?')) {
              return;
            }
            await fetch('/companion/subtitles/' + encodeURIComponent(item.id), {
              method: 'DELETE',
              headers: authHeaders(true),
            });
            await refreshList();
            await refreshStorage();
            await checkHealth();
          });
          li.appendChild(info);
          li.appendChild(delBtn);
          listEl.appendChild(li);
        }
      }

      async function uploadTrack(fileInputId, langSelectId, statusId) {
        const fileInput = document.getElementById(fileInputId);
        const langSelect = document.getElementById(langSelectId);
        const statusEl = document.getElementById(statusId);
        const contentId = document.getElementById('content-id').value.trim();

        statusEl.className = 'status-msg';
        if (!fileInput.files || fileInput.files.length === 0) {
          statusEl.className = 'status-msg error';
          statusEl.textContent = 'Please select an .srt or .vtt file first.';
          return;
        }

        const file = fileInput.files[0];
        const content = await file.text();
        const res = await fetch('/companion/subtitles', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify({
            contentId,
            language: langSelect.value,
            filename: file.name,
            content,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          statusEl.className = 'status-msg error';
          statusEl.textContent = data.error || 'Upload failed.';
          return;
        }
        statusEl.textContent = 'Saved ' + data.subtitle.filename + ' (' + data.subtitle.cueCount + ' cues).';
        await refreshList();
        await refreshStorage();
        await checkHealth();
      }

      async function runPreview() {
        const stage = document.getElementById('preview-stage');
        const res = await fetch('/companion/preview', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify({
            contentId: document.getElementById('content-id').value.trim(),
            primaryLanguage: document.getElementById('primary-lang').value,
            secondaryLanguage: document.getElementById('secondary-lang').value,
            primaryOffsetMs: Number(document.getElementById('primary-offset').value || 0),
            secondaryOffsetMs: Number(document.getElementById('secondary-offset').value || 0),
            order: document.getElementById('order-select').value,
            limit: 4,
          }),
        });
        const data = await res.json();
        stage.innerHTML = '';
        if (!res.ok) {
          const err = document.createElement('span');
          err.className = 'status-msg error';
          err.textContent = data.error || 'Could not generate preview.';
          stage.appendChild(err);
          return;
        }
        for (const cue of data.cues) {
          const box = document.createElement('div');
          box.className = 'cue-box';
          const time = document.createElement('div');
          time.className = 'cue-time';
          time.textContent = (cue.startTime / 1000).toFixed(2) + 's → ' + (cue.endTime / 1000).toFixed(2) + 's';
          const text = document.createElement('div');
          text.textContent = cue.text;
          box.appendChild(time);
          box.appendChild(text);
          stage.appendChild(box);
        }
      }

      async function generateInstallUrls() {
        const statusEl = document.getElementById('install-status');
        statusEl.className = 'status-msg';
        const res = await fetch('/companion/install-url', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify({
            primaryLanguage: document.getElementById('primary-lang').value,
            secondaryLanguage: document.getElementById('secondary-lang').value,
            primaryOffsetMs: String(document.getElementById('primary-offset').value || 0),
            secondaryOffsetMs: String(document.getElementById('secondary-offset').value || 0),
            order: document.getElementById('order-select').value,
            bilingualEnabled: 'on',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          statusEl.className = 'status-msg error';
          statusEl.textContent = data.error || 'Invalid configuration.';
          return;
        }
        document.getElementById('http-manifest-url').textContent = data.httpManifestUrl;
        document.getElementById('stremio-deep-link').textContent = data.stremioDeepLink;
        statusEl.textContent = 'Stremio install URL updated.';
      }

      document.getElementById('persistence-toggle').addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        const statusEl = document.getElementById('storage-status');
        statusEl.className = 'status-msg';
        const res = await fetch('/companion/storage/consent', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify({ enabled }),
        });
        const data = await res.json();
        if (!res.ok) {
          statusEl.className = 'status-msg error';
          statusEl.textContent = data.error || 'Failed to update persistence setting.';
          e.target.checked = !enabled;
          return;
        }
        statusEl.textContent = enabled
          ? 'Local disk persistence enabled.'
          : 'Local disk persistence disabled (memory-only mode).';
        await refreshStorage();
      });

      document.getElementById('clear-library-btn').addEventListener('click', async () => {
        if (!window.confirm('Clear ALL registered local subtitles from memory and local storage?')) {
          return;
        }
        const statusEl = document.getElementById('storage-status');
        const res = await fetch('/companion/subtitles', {
          method: 'DELETE',
          headers: authHeaders(true),
        });
        if (res.ok) {
          statusEl.className = 'status-msg';
          statusEl.textContent = 'Local subtitle library cleared.';
          await refreshList();
          await refreshStorage();
          await checkHealth();
        }
      });

      document.getElementById('upload-primary-btn').addEventListener('click', () =>
        uploadTrack('primary-file', 'primary-lang', 'primary-status'),
      );
      document.getElementById('upload-secondary-btn').addEventListener('click', () =>
        uploadTrack('secondary-file', 'secondary-lang', 'secondary-status'),
      );
      document.getElementById('preview-btn').addEventListener('click', runPreview);
      document.getElementById('generate-url-btn').addEventListener('click', generateInstallUrls);
      document.getElementById('copy-url-btn').addEventListener('click', async () => {
        const url = document.getElementById('http-manifest-url').textContent || '';
        try {
          await navigator.clipboard.writeText(url);
          document.getElementById('install-status').textContent = 'Copied manifest URL to clipboard.';
        } catch {
          document.getElementById('install-status').textContent = 'Copy manually from the box above.';
        }
      });

      checkHealth();
      checkManifestReady();
      refreshStorage();
      refreshList();
    })();
  </script>
</body>
</html>`;
}
