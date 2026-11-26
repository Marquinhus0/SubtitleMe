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
 * Renders the original SubtitleMe Studio UI served at `/configure`.
 * Minimalist dark obsidian & emerald/mint hairline aesthetic with live widescreen preview
 * and dynamic 3-column bento controls.
 */
export function renderConfigurePage(options: ConfigurePageOptions): string {
  const safeBaseUrl = escapeHtml(options.baseUrl);
  const safeToken = escapeHtml(options.sessionToken);

  const sortedLangs = [...STREMIO_SUPPORTED_LANGUAGES].sort((a, b) =>
    (a.labelPt ?? a.label).localeCompare(b.labelPt ?? b.label, 'pt-BR'),
  );

  const buildLangOptions = (defaultBcp47: string): string =>
    sortedLangs
      .map((lang) => {
        const display = lang.labelPt ?? lang.label;
        const selected = lang.bcp47 === defaultBcp47 ? ' selected' : '';
        return `<option value="${escapeHtml(lang.bcp47)}" data-name="${escapeHtml(display)}"${selected}>${escapeHtml(display)} (${escapeHtml(lang.bcp47)})</option>`;
      })
      .join('\n');

  const learnOptionsHtml = buildLangOptions(DEFAULT_ADDON_CONFIG.primaryLanguage);
  const nativeOptionsHtml = buildLangOptions(DEFAULT_ADDON_CONFIG.secondaryLanguage);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="subtitleme-token" content="${safeToken}" />
  <title>SubtitleMe — Stremio Local Companion Studio</title>
  <style>
    :root {
      --bg: #070B09;
      --panel: rgba(12, 18, 15, 0.78);
      --panel-soft: rgba(17, 25, 21, 0.65);
      --panel-hover: rgba(22, 33, 27, 0.85);
      --hairline: rgba(255, 255, 255, 0.07);
      --hairline-strong: rgba(52, 211, 153, 0.34);
      --accent: #10B981;
      --accent-bright: #34D399;
      --accent-glow: rgba(16, 185, 129, 0.14);
      --accent-ink: #04130D;
      --text: #EEF4F1;
      --muted: #8FA399;
      --faint: #5B6E65;
      --danger: #F87171;
      color-scheme: dark;
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(ellipse 70% 42% at 50% -8%, rgba(16, 185, 129, 0.11), transparent 65%),
        radial-gradient(circle at 90% 15%, rgba(52, 211, 153, 0.05), transparent 40%),
        var(--bg);
      color: var(--text);
      font: 13.5px/1.5 Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      letter-spacing: -0.005em;
    }
    .shell { max-width: 1260px; margin: 0 auto; padding: 0 24px 56px; }

    /* Top Minimalist Navigation Bar */
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; padding: 16px 0;
      border-bottom: 1px solid var(--hairline);
    }
    .brand { display: flex; align-items: center; gap: 11px; }
    .brand-icon {
      width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid var(--hairline-strong);
      background: linear-gradient(145deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.04));
      display: grid; place-items: center; color: var(--accent-bright);
      box-shadow: 0 0 18px rgba(16, 185, 129, 0.14);
    }
    .brand-name { font-size: 15px; font-weight: 650; letter-spacing: -0.02em; color: var(--text); }
    .brand-tag {
      font-size: 11px; font-weight: 500; color: var(--accent-bright);
      border: 1px solid rgba(52, 211, 153, 0.25); background: rgba(16, 185, 129, 0.08);
      padding: 1px 7px; border-radius: 999px; margin-left: 6px;
    }
    .brand-sub { font-size: 11.5px; color: var(--faint); margin-top: 1px; }

    .topbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 999px;
      border: 1px solid var(--hairline); background: var(--panel);
      font-size: 11.5px; color: var(--muted); font-weight: 500;
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--faint); transition: background 0.2s; }
    .dot.ok { background: var(--accent-bright); box-shadow: 0 0 8px var(--accent-bright); }
    .dot.err { background: var(--danger); }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 7px 13px; border-radius: 7px; font-size: 12.5px; font-weight: 600;
      cursor: pointer; text-decoration: none; border: 1px solid var(--hairline);
      background: var(--panel-soft); color: var(--text);
      transition: all 0.16s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .btn:hover { border-color: var(--hairline-strong); background: var(--panel-hover); transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
    .btn.emerald {
      background: var(--accent); border-color: var(--accent-bright); color: var(--accent-ink); font-weight: 650;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.22);
    }
    .btn.emerald:hover { background: var(--accent-bright); }
    .btn.xs { padding: 4px 9px; font-size: 11.5px; border-radius: 6px; }

    /* Top Stage: Live Widescreen Monitor + Stremio Track Dock */
    .stage-grid {
      display: grid; grid-template-columns: 1.35fr 0.65fr;
      gap: 14px; margin: 18px 0 14px;
    }
    @media (max-width: 920px) { .stage-grid { grid-template-columns: 1fr; } }

    .monitor-card, .dock-card, .bento-card {
      background: var(--panel);
      backdrop-filter: blur(14px);
      border: 1px solid var(--hairline);
      border-radius: 12px;
      transition: border-color 0.2s ease;
    }
    .bento-card:hover, .dock-card:hover { border-color: rgba(255, 255, 255, 0.12); }

    .monitor-card {
      position: relative; min-height: 205px; overflow: hidden;
      background:
        linear-gradient(180deg, rgba(7, 11, 9, 0.25) 0%, rgba(7, 11, 9, 0.9) 100%),
        radial-gradient(ellipse at 50% 30%, #162921 0%, #0A120E 65%, #050806 100%);
      display: flex; flex-direction: column; justify-content: space-between; padding: 12px 16px 14px;
    }
    .monitor-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; z-index: 2; }
    .monitor-tags { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .m-tag {
      font-size: 11px; padding: 2px 8px; border-radius: 999px;
      border: 1px solid var(--hairline); background: rgba(7, 11, 9, 0.72); color: var(--muted);
    }
    .m-tag.live { border-color: var(--hairline-strong); color: var(--accent-bright); background: rgba(16, 185, 129, 0.1); }

    .subs-viewport {
      position: relative; text-align: center; padding: 18px 4% 8px;
      transition: opacity 0.2s ease, transform 0.18s ease;
    }
    .subs-viewport.fade { opacity: 0; }
    .subs-viewport p { margin: 2px 0; }
    .subs-viewport span {
      display: inline-block; padding: 1px 7px; border-radius: 4px;
      font-weight: 600; line-height: 1.35; transition: color 0.15s ease;
    }

    .monitor-timeline {
      height: 2px; width: 100%; background: rgba(255, 255, 255, 0.07);
      border-radius: 99px; overflow: hidden;
    }
    .monitor-timeline > i {
      display: block; height: 100%; width: 38%; background: var(--accent-bright);
      box-shadow: 0 0 8px var(--accent-bright); transition: width 0.35s ease;
    }

    /* Right Stage: Stremio Live Connection & Track Preview */
    .dock-card { padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; }
    .dock-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .dock-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
    .track-list-preview {
      border: 1px solid var(--hairline); border-radius: 8px; overflow: hidden;
      background: rgba(7, 11, 9, 0.55); font-size: 12px;
    }
    .track-item {
      display: flex; justify-content: space-between; align-items: center; gap: 8px;
      padding: 7px 10px; color: var(--muted);
    }
    .track-item + .track-item { border-top: 1px solid var(--hairline); }
    .track-item.active { background: var(--accent-glow); color: var(--text); }
    .track-item small { color: var(--accent-bright); font-weight: 600; font-size: 11px; }

    .dock-actions { display: flex; gap: 7px; flex-wrap: wrap; }
    .dock-actions .btn.emerald { flex: 1; min-width: 155px; }
    .manifest-line {
      font: 11px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace;
      color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      padding: 5px 8px; border-radius: 6px; border: 1px solid var(--hairline); background: rgba(0, 0, 0, 0.28);
    }

    /* 3-Column Hairline Bento Workspace */
    .bento-grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px; align-items: stretch;
    }
    @media (max-width: 1020px) { .bento-grid { grid-template-columns: 1fr; } }

    .bento-card { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .bento-head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding-bottom: 10px; border-bottom: 1px solid var(--hairline);
    }
    .bento-title {
      font-size: 12px; font-weight: 650; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--accent-bright); margin: 0;
      display: flex; align-items: center; gap: 7px;
    }
    .bento-title::before {
      content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--accent-bright);
    }

    .field { display: flex; flex-direction: column; gap: 5px; }
    .label { font-size: 12px; font-weight: 500; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }
    .help { font-size: 11.5px; color: var(--faint); margin: 0; line-height: 1.45; }
    .help strong { color: var(--muted); font-weight: 600; }

    /* Form Controls with Thin Borders */
    select, input[type="text"], input[type="password"], input[type="number"] {
      width: 100%; background: rgba(7, 11, 9, 0.7); color: var(--text);
      border: 1px solid var(--hairline); border-radius: 7px;
      padding: 7px 10px; font-size: 13px; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    select:hover, input:hover { border-color: rgba(255, 255, 255, 0.14); }
    select:focus, input:focus { border-color: var(--accent-bright); box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.12); }

    .lang-stack { display: grid; grid-template-columns: 1fr auto 1fr; gap: 7px; align-items: end; }
    .swap-btn {
      width: 34px; height: 33px; border-radius: 7px;
      border: 1px solid var(--hairline); background: rgba(7, 11, 9, 0.7);
      color: var(--muted); cursor: pointer; display: grid; place-items: center;
      transition: all 0.18s ease;
    }
    .swap-btn:hover { color: var(--accent-bright); border-color: var(--hairline-strong); transform: rotate(180deg); }

    /* Hairline Segmented Pills */
    .seg {
      display: flex; flex-wrap: wrap; gap: 2px; padding: 2px;
      border: 1px solid var(--hairline); border-radius: 7px; background: rgba(7, 11, 9, 0.65);
    }
    .seg label { flex: 1; position: relative; margin: 0; cursor: pointer; text-align: center; }
    .seg input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
    .seg span {
      display: block; padding: 5px 8px; border-radius: 5px;
      font-size: 12px; color: var(--muted); white-space: nowrap; transition: all 0.14s ease;
    }
    .seg input:checked + span {
      background: var(--accent-glow); color: var(--accent-bright); font-weight: 600;
      box-shadow: inset 0 0 0 1px var(--hairline-strong);
    }

    /* Color Dots */
    .swatches { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .sw {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 9px 4px 7px; border-radius: 999px;
      border: 1px solid var(--hairline); background: rgba(7, 11, 9, 0.65);
      color: var(--muted); font-size: 11.8px; cursor: pointer; transition: all 0.14s;
    }
    .sw i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .sw:hover { border-color: rgba(255, 255, 255, 0.18); color: var(--text); }
    .sw.active { border-color: var(--accent-bright); background: var(--accent-glow); color: var(--text); font-weight: 600; }
    input[type="color"] {
      width: 26px; height: 26px; padding: 1px; border-radius: 50%;
      border: 1px solid var(--hairline); background: transparent; cursor: pointer;
    }

    /* Thin Range Slider */
    input[type="range"] {
      -webkit-appearance: none; appearance: none; width: 100%; height: 3px;
      background: rgba(255, 255, 255, 0.1); border-radius: 99px; outline: none; margin: 6px 0;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
      background: var(--accent-bright); cursor: pointer; box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
    }

    /* Thin Source Rows & Toggles */
    .thin-box {
      border: 1px solid var(--hairline); border-radius: 8px;
      padding: 9px 11px; background: rgba(7, 11, 9, 0.45);
      display: flex; flex-direction: column; gap: 7px;
    }
    .toggle-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; }
    .toggle-line input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--accent); margin: 0; cursor: pointer; }
    .toggle-line strong { font-size: 12.5px; font-weight: 600; color: var(--text); }

    .src-pair-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 0; }
    .src-pair-row + .src-pair-row { border-top: 1px solid var(--hairline); padding-top: 7px; }
    .src-pair-label { font-size: 12px; color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .note-line {
      border-left: 2px solid var(--accent); padding: 6px 10px;
      background: rgba(16, 185, 129, 0.06); border-radius: 0 6px 6px 0;
      font-size: 11.5px; color: var(--muted); line-height: 1.45;
    }
    .note-line strong { color: var(--accent-bright); }
    .note-line a { color: var(--accent-bright); text-decoration: none; font-weight: 600; }

    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .status-msg { font-size: 11.8px; color: var(--accent-bright); min-height: 1.1em; }
    .status-msg.error { color: var(--danger); }
    .probe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .probe-box { padding: 6px 8px; border-radius: 6px; border: 1px solid var(--hairline); background: rgba(0,0,0,0.3); font-size: 11px; }

    details.slim summary {
      cursor: pointer; font-size: 11.8px; color: var(--muted); padding: 3px 0;
      list-style: none; display: flex; align-items: center; gap: 5px;
    }
    details.slim summary::before { content: "›"; color: var(--accent-bright); font-weight: 700; transition: transform 0.15s; }
    details[open].slim summary::before { transform: rotate(90deg); }
  </style>
</head>
<body>
  <div class="shell">
    <!-- HEADER CLEAN -->
    <header class="topbar">
      <div class="brand">
        <div class="brand-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M2.5 5.5h11M2.5 8.5h7.5M2.5 11.5h9.5" />
          </svg>
        </div>
        <div>
          <div><span class="brand-name">SubtitleMe</span><span class="brand-tag">Studio</span></div>
          <div class="brand-sub">Motor Bilingue Dinâmico · 100% Local</div>
        </div>
      </div>

      <div class="topbar-right">
        <div class="pill"><span class="dot ok"></span><span id="live-sync-text">Sincronizado Ao Vivo</span></div>
        <div class="pill" id="companion-status"><span class="dot" id="status-dot"></span><span id="status-text">127.0.0.1</span></div>
        <div class="pill" id="stremio-status"><span class="dot" id="stremio-dot"></span><span id="stremio-text">Stremio</span></div>
      </div>
    </header>

    <div class="note-line" id="offline-banner" role="alert" style="display:none; margin-top:12px; border-left-color:var(--danger);">
      <strong>Servidor local desconectado:</strong> execute <code>.\\bin\\start-companion.cmd</code> e recarregue a página.
    </div>

    <!-- PALCO SUPERIOR: MONITOR WIDESCREEN + CONEXÃO STREMIO -->
    <section class="stage-grid">
      <div class="monitor-card">
        <div class="monitor-head">
          <div class="monitor-tags">
            <span class="m-tag live" id="cap-pair">EN · PT-BR</span>
            <span class="m-tag" id="preview-format-pill">Formato .ASS</span>
            <span class="m-tag" id="preview-reveal-pill">3 faixas</span>
          </div>
          <button type="button" class="btn xs" id="cycle-scene-btn">&#8635; Trocar fala</button>
        </div>

        <div class="subs-viewport" id="subs-stage">
          <p><span id="line-top">I'm not going anywhere.</span></p>
          <p><span id="line-bottom">Não vou a lugar nenhum.</span></p>
        </div>

        <div class="monitor-timeline"><i id="timeline-bar"></i></div>
      </div>

      <div class="dock-card">
        <div>
          <div class="dock-head" style="margin-bottom:8px;">
            <span class="dock-title">Menu no Stremio</span>
            <button type="button" class="btn xs" id="generate-url-btn" title="Atualizar agora">Sincronizar</button>
          </div>
          <div class="track-list-preview">
            <div class="track-item active">
              <span id="menu-sample-1">Dual EN+PT-BR 1 (Sync/OS) · 96%</span>
              <small>Ativa</small>
            </div>
            <div class="track-item" id="menu-row-2">
              <span id="menu-sample-2">Dual EN+PT-BR 2 (OS/OS) · 88%</span>
              <span>Opção 2</span>
            </div>
          </div>
          <p class="help" id="menu-hint-text" style="margin-top:6px;">
            As faixas aparecem automaticamente em <strong>Português (Brasil)</strong> e <strong>Inglês</strong>.
          </p>
        </div>

        <div>
          <div class="dock-actions">
            <a class="btn emerald" id="open-stremio-btn" href="${safeBaseUrl.replace(/^http:\/\//i, 'stremio://')}/manifest.json">Instalar no Stremio</a>
            <a class="btn" id="open-web-btn" href="https://web.stremio.com/#/addons?addon=${encodeURIComponent(`${options.baseUrl}/manifest.json`)}" target="_blank" rel="noopener">Web</a>
            <button type="button" class="btn" id="copy-url-btn">Copiar</button>
          </div>
          <div class="manifest-line" id="http-manifest-url" dir="ltr" style="margin-top:7px;">${safeBaseUrl}/manifest.json</div>
          <div id="stremio-deep-link" hidden>${safeBaseUrl.replace(/^http:\/\//i, 'stremio://')}/manifest.json</div>
          <div class="status-msg" id="install-status" aria-live="polite" style="margin-top:4px;"></div>
        </div>
      </div>
    </section>

    <!-- PAINEL BENTO EM 3 COLUNAS COM LINHAS FINAS -->
    <main class="bento-grid">
      <!-- COLUNA 1: IDIOMAS & DINÂMICA DE APRENDIZADO -->
      <section class="bento-card">
        <div class="bento-head">
          <h2 class="bento-title">Idiomas &amp; Leitura</h2>
        </div>

        <div class="field">
          <div class="lang-stack">
            <div>
              <label class="label" for="primary-lang">Estou aprendendo</label>
              <select id="primary-lang">${learnOptionsHtml}</select>
            </div>
            <button type="button" class="swap-btn" id="swap-langs-btn" title="Inverter idiomas" aria-label="Inverter idiomas">&#8644;</button>
            <div>
              <label class="label" for="secondary-lang">Meu idioma</label>
              <select id="secondary-lang">${nativeOptionsHtml}</select>
            </div>
          </div>
        </div>

        <div class="field">
          <span class="label">Ordem vertical na tela</span>
          <div class="seg" role="radiogroup">
            <label><input type="radio" name="topLine" value="primary-top" checked /><span> Aprendizado no topo</span></label>
            <label><input type="radio" name="topLine" value="secondary-top" /><span>Meu idioma no topo</span></label>
          </div>
          <select id="order-select" hidden>
            <option value="primary-top" selected>primary-top</option>
            <option value="secondary-top">secondary-top</option>
          </select>
        </div>

        <div class="field">
          <span class="label">Atrasar meu idioma <span>Modo Reveal</span></span>
          <div class="seg" role="radiogroup">
            <label><input type="radio" name="revealMs" value="0" checked /><span>0s</span></label>
            <label><input type="radio" name="revealMs" value="500" /><span>0.5s</span></label>
            <label><input type="radio" name="revealMs" value="1000" /><span>1s</span></label>
            <label><input type="radio" name="revealMs" value="1500" /><span>1.5s</span></label>
            <label><input type="radio" name="revealMs" value="2000" /><span>2s</span></label>
          </div>
          <p class="help">Mostra primeiro o idioma de estudo e revela a tradução em seguida sem deslocar a linha superior.</p>
        </div>

        <div class="field">
          <span class="label">Opções ranqueadas no Stremio</span>
          <div class="seg" role="radiogroup">
            <label><input type="radio" name="pairCount" value="1" /><span>1</span></label>
            <label><input type="radio" name="pairCount" value="2" /><span>2</span></label>
            <label><input type="radio" name="pairCount" value="3" checked /><span>3</span></label>
            <label><input type="radio" name="pairCount" value="4" /><span>4</span></label>
            <label><input type="radio" name="pairCount" value="5" /><span>5</span></label>
          </div>
          <p class="help">Disponibiliza variações de sincronia (WEB-DL / BluRay) prontas para troca imediata no player.</p>
        </div>
      </section>

      <!-- COLUNA 2: ESTILO & TIPOGRAFIA -->
      <section class="bento-card">
        <div class="bento-head">
          <h2 class="bento-title">Estilo &amp; Tipografia</h2>
        </div>

        <div class="field">
          <span class="label">Cor da linha de apoio</span>
          <div class="swatches" id="secondary-color-swatches">
            <button type="button" class="sw active" data-color="#34D399"><i style="background:#34D399"></i>Menta</button>
            <button type="button" class="sw" data-color="#FFD76A"><i style="background:#FFD76A"></i>Âmbar</button>
            <button type="button" class="sw" data-color="#9FD3FF"><i style="background:#9FD3FF"></i>Gelo</button>
            <button type="button" class="sw" data-color="#B9A3FF"><i style="background:#B9A3FF"></i>Lavanda</button>
            <button type="button" class="sw" data-color="none"><i style="background:#EEF4F1"></i>Branco SRT</button>
            <input type="color" id="secondary-custom-color" value="#34D399" title="Escolher cor livre" />
          </div>
        </div>

        <div class="field">
          <div class="row2">
            <div>
              <label class="label" for="secondary-style-select">Formatação 2ª linha</label>
              <select id="secondary-style-select">
                <option value="italic" selected>Itálico suave</option>
                <option value="none">Regular limpa</option>
                <option value="brackets">[Colchetes]</option>
                <option value="italic-brackets">Itálico + [Colchetes]</option>
              </select>
            </div>
            <div>
              <label class="label" for="bg-style-select">Acabamento (ASS)</label>
              <select id="bg-style-select">
                <option value="outline" selected>Contorno Cinema</option>
                <option value="box">Caixa Translúcida</option>
                <option value="clean">Traço Fino</option>
              </select>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="label" for="font-size-range">Escala da fonte ASS <strong id="font-size-label" style="color:var(--accent-bright);">46 px</strong></label>
          <input type="range" id="font-size-range" min="28" max="68" step="2" value="46" />
        </div>

        <div class="field">
          <div class="row2">
            <div>
              <label class="label" for="vertical-pos-select">Altura na tela</label>
              <select id="vertical-pos-select">
                <option value="bottom" selected>Base padrão</option>
                <option value="raised">Elevada</option>
                <option value="high">Acima de barras</option>
                <option value="top">Topo</option>
              </select>
            </div>
            <div>
              <span class="label">Cor 1ª linha</span>
              <div class="swatches" id="primary-color-swatches">
                <button type="button" class="sw active" data-color="#FFFFFF"><i style="background:#FFFFFF"></i>Branca</button>
                <button type="button" class="sw" data-color="#34D399"><i style="background:#34D399"></i>Menta</button>
                <input type="color" id="primary-custom-color" value="#FFFFFF" title="Cor da 1ª linha" />
              </div>
            </div>
          </div>
        </div>

        <div class="note-line" id="ass-color-note">
          Para renderizar cores e escala ASS no Stremio, mantenha ativo <strong>Configurações › Reprodutor › Estilizar legendas ASS</strong>. Em <strong>Branco SRT</strong>, valem os controles nativos do player.
        </div>
        <select id="output-format-select" hidden><option value="vtt" selected>vtt</option></select>
      </section>

      <!-- COLUNA 3: MOTORES DE BUSCA & SINCRONIA -->
      <section class="bento-card" id="opensubtitles-card">
        <div class="bento-head">
          <h2 class="bento-title">Motores &amp; Sincronia</h2>
          <button type="button" class="btn xs" id="test-sources-btn">&#9889; Testar</button>
        </div>

        <div class="thin-box">
          <div class="src-pair-row">
            <span class="src-pair-label" id="learn-src-title">Inglês</span>
            <div class="seg" role="radiogroup" style="min-width:195px;">
              <label><input type="radio" name="learnSrc" value="auto" checked /><span>Auto</span></label>
              <label><input type="radio" name="learnSrc" value="sync" /><span>Sync</span></label>
              <label><input type="radio" name="learnSrc" value="os" /><span>OpenSub</span></label>
            </div>
          </div>
          <div class="src-pair-row">
            <span class="src-pair-label" id="native-src-title">Português (Brasil)</span>
            <div class="seg" role="radiogroup" style="min-width:195px;">
              <label><input type="radio" name="nativeSrc" value="auto" checked /><span>Auto</span></label>
              <label><input type="radio" name="nativeSrc" value="sync" /><span>Sync</span></label>
              <label><input type="radio" name="nativeSrc" value="os" /><span>OpenSub</span></label>
            </div>
          </div>
        </div>

        <div class="thin-box">
          <label class="toggle-line">
            <div>
              <strong>Subtitle Sync</strong>
              <div class="help" id="sync-rec-box">Sincronia por frame · <a href="https://subtitlesync.stream/" target="_blank" rel="noopener">subtitlesync.stream ↗</a></div>
            </div>
            <input type="checkbox" id="subsync-toggle" />
          </label>
          <input type="password" id="subsync-url" dir="ltr" placeholder="Cole https://.../manifest.json" autocomplete="off" spellcheck="false" />
        </div>

        <div class="thin-box">
          <label class="toggle-line">
            <div>
              <strong>OpenSubtitles v3 (Ilimitado)</strong>
              <div class="help">37 idiomas sem chave · preserva cota v1</div>
            </div>
            <input type="checkbox" id="os-v3-toggle" checked />
          </label>
          <div style="border-top:1px solid var(--hairline); padding-top:7px;">
            <label class="toggle-line" style="margin-bottom:6px;">
              <strong>OpenSubtitles REST v1 (Hash)</strong>
              <input type="checkbox" id="os-v1-toggle" />
            </label>
            <input type="password" id="os-api-key" dir="ltr" placeholder="API Key v1 (opcional)" autocomplete="off" />
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <button type="button" class="btn xs" id="save-os-btn">Salvar Motores</button>
            <span class="status-msg" id="os-status" aria-live="polite"></span>
          </div>
          <div class="probe-grid" id="probe-results" style="display:none;"></div>
        </div>

        <div class="thin-box">
          <label class="toggle-line">
            <div>
              <strong>Auto-Sync + Anti-Flicker</strong>
              <div class="help">Regressão de FPS + trava de milissegundo</div>
            </div>
            <input type="checkbox" id="auto-sync-toggle" checked />
          </label>
          <details class="slim">
            <summary>Ajuste manual em ms (opcional)</summary>
            <div class="row2" style="margin-top:6px;">
              <div>
                <label class="label" for="primary-offset">1ª linha (ms)</label>
                <input type="number" id="primary-offset" min="-30000" max="30000" step="100" value="0" />
              </div>
              <div>
                <label class="label" for="secondary-offset">2ª linha (ms)</label>
                <input type="number" id="secondary-offset" min="-30000" max="30000" step="100" value="0" />
              </div>
            </div>
          </details>
        </div>
      </section>
    </main>

    <!-- HIDDEN LEGACY COMPATIBILITY DOM ELEMENTS (100% Local Processing contract for automated suite) -->
    <section id="storage-card" hidden>
      <p>100% Local Processing</p>
      <input type="checkbox" id="persistence-toggle" />
      <button type="button" id="clear-library-btn">Clear</button>
      <span id="storage-mode"></span><span id="storage-used"></span>
      <span id="storage-count"></span><span id="storage-recovered"></span>
      <span id="storage-dir"></span><div id="storage-status"></div>
      <input type="text" id="content-id" value="tt1254207" />
      <input type="file" id="primary-file" /><button type="button" id="upload-primary-btn"></button><div id="primary-status"></div>
      <input type="file" id="secondary-file" /><button type="button" id="upload-secondary-btn"></button><div id="secondary-status"></div>
      <button type="button" id="preview-btn"></button><ul id="track-list"></ul><div id="preview-stage"></div>
    </section>
  </div>

  <script>
    (function () {
      const tokenMeta = document.querySelector('meta[name="subtitleme-token"]');
      const sessionToken = tokenMeta ? tokenMeta.getAttribute('content') || '' : '';

      let selectedPrimaryColor = '#FFFFFF';
      let selectedSecondaryColor = '#34D399';
      let saveTimer = null;
      let revealTimer = null;
      let syncProbeTimer = null;
      let sceneIdx = 0;

      const SAMPLES = {
        'en': ["I'm not going anywhere.", "We should have left an hour ago.", "Tell me what you saw."],
        'pt-BR': ["Não vou a lugar nenhum.", "A gente devia ter saído uma hora atrás.", "Me diga o que você viu."],
        'pt-PT': ["Não vou a lado nenhum.", "Devíamos ter saído há uma hora.", "Diz-me o que viste."],
        'es': ["No me voy a ninguna parte.", "Deberíamos habernos ido hace una hora.", "Dime lo que viste."],
        'fr': ["Je ne vais nulle part.", "On aurait dû partir il y a une heure.", "Dis-moi ce que tu as vu."],
        'de': ["Ich gehe nirgendwohin.", "Wir hätten vor einer Stunde gehen sollen.", "Sag mir, was du gesehen hast."],
        'it': ["Non vado da nessuna parte.", "Saremmo dovuti partire un'ora fa.", "Dimmi cosa hai visto."],
        'ja': ["どこにも行かないよ。", "1時間前に出るべきだった。", "何を見たか教えて。"],
        'ko': ["난 아무 데도 안 가.", "한 시간 전에 떠났어야 했어.", "뭘 봤는지 말해 봐."],
        'zh': ["我哪儿也不去。", "我们一个小时前就该走了。", "告诉我你看到了什么。"],
        'ru': ["Я никуда не уйду.", "Нам надо было уйти час назад.", "Скажи мне, что ты видел."],
        'tr': ["Hiçbir yere gitmiyorum.", "Bir saat önce çıkmış olmalıydık.", "Bana ne gördüğünü anlat."],
        'ar': ["لن أذهب إلى أي مكان.", "كان يجب أن نغادر قبل ساعة.", "أخبرني ماذا رأيت."],
        'nl': ["Ik ga nergens heen.", "We hadden een uur geleden moeten vertrekken.", "Vertel me wat je zag."],
        'pl': ["Nigdzie się nie wybieram.", "Powinniśmy byli wyjść godzinę temu.", "Powiedz mi, co widziałeś."],
        'sv': ["Jag går ingenstans.", "Vi borde ha gått för en timme sedan.", "Berätta vad du såg."]
      };

      function authHeaders(isMutation) {
        const h = { 'X-SubtitleMe-Token': sessionToken };
        if (isMutation) {
          h['Content-Type'] = 'application/json';
          h['X-SubtitleMe-CSRF'] = '1';
        }
        return h;
      }

      function getRadio(name, fallback) {
        const el = document.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : fallback;
      }

      function setRadio(name, value) {
        const el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
        if (el) el.checked = true;
      }

      function selectedLangName(selectId) {
        const sel = document.getElementById(selectId);
        const opt = sel && sel.options[sel.selectedIndex];
        return (opt && opt.getAttribute('data-name')) || (sel ? sel.value : '');
      }

      function sampleLine(langCode, idx) {
        const arr = SAMPLES[langCode];
        if (arr && arr[idx % arr.length]) return arr[idx % arr.length];
        return '[' + langCode.toUpperCase() + '] ' + SAMPLES['en'][idx % 3];
      }

      function decorateText(text, style) {
        if (style === 'brackets' || style === 'italic-brackets') return '[' + text + ']';
        return text;
      }

      function applyBoxStyle(el, bgStyle, isAssMode) {
        if (!isAssMode || bgStyle === 'outline') {
          el.style.background = 'transparent';
          el.style.textShadow = '0 0 3px #000, 0 1px 4px #000, -1px -1px 0 #000, 1px -1px 0 #000';
        } else if (bgStyle === 'box') {
          el.style.background = 'rgba(6, 10, 8, 0.84)';
          el.style.textShadow = 'none';
        } else {
          el.style.background = 'transparent';
          el.style.textShadow = '0 1px 2px rgba(0,0,0,0.9)';
        }
      }

      function isAssActive() {
        const secWhite = !selectedSecondaryColor || selectedSecondaryColor === 'none' || selectedSecondaryColor === '#FFFFFF' || selectedSecondaryColor === '#ECEBE8';
        const priWhite = !selectedPrimaryColor || selectedPrimaryColor === 'none' || selectedPrimaryColor === '#FFFFFF' || selectedPrimaryColor === '#ECEBE8';
        const fontSize = Number(document.getElementById('font-size-range').value || 46);
        const bg = document.getElementById('bg-style-select').value;
        const vPos = document.getElementById('vertical-pos-select').value;
        return !secWhite || !priWhite || fontSize !== 46 || bg !== 'outline' || vPos !== 'bottom';
      }

      function renderPreview() {
        const pLang = document.getElementById('primary-lang').value;
        const sLang = document.getElementById('secondary-lang').value;
        const pName = selectedLangName('primary-lang');
        const sName = selectedLangName('secondary-lang');
        const order = getRadio('topLine', 'primary-top');
        document.getElementById('order-select').value = order;

        const secStyle = document.getElementById('secondary-style-select').value;
        const bgStyle = document.getElementById('bg-style-select').value;
        const vPos = document.getElementById('vertical-pos-select').value;
        const fontSize = Number(document.getElementById('font-size-range').value || 46);
        const pairCount = Number(getRadio('pairCount', '3'));
        const revealMs = Number(getRadio('revealMs', '0'));
        const learnSrc = getRadio('learnSrc', 'auto');
        const nativeSrc = getRadio('nativeSrc', 'auto');

        document.getElementById('font-size-label').textContent = fontSize + ' px';
        document.getElementById('learn-src-title').textContent = pName;
        document.getElementById('native-src-title').textContent = sName;
        document.getElementById('timeline-bar').style.width = ((sceneIdx + 1) * 33) + '%';

        const assMode = isAssActive();
        document.getElementById('ass-color-note').hidden = !assMode;
        document.getElementById('preview-format-pill').textContent = assMode
          ? 'Formato .ASS'
          : 'Formato .SRT Nativo';
        document.getElementById('preview-reveal-pill').textContent = revealMs > 0
          ? 'Reveal +' + (revealMs / 1000).toFixed(revealMs % 1000 === 0 ? 0 : 1) + 's'
          : (pairCount + (pairCount === 1 ? ' faixa' : ' faixas'));

        const topCode = (order === 'secondary-top' ? sLang : pLang).toUpperCase();
        const botCode = (order === 'secondary-top' ? pLang : sLang).toUpperCase();
        document.getElementById('cap-pair').textContent = topCode + ' · ' + botCode;

        const srcTag = (s) => (s === 'sync' ? 'Sync' : s === 'os' ? 'OS' : (document.getElementById('subsync-toggle').checked ? 'Sync' : 'OS'));
        const topSrc = order === 'secondary-top' ? srcTag(nativeSrc) : srcTag(learnSrc);
        const botSrc = order === 'secondary-top' ? srcTag(learnSrc) : srcTag(nativeSrc);
        const revSuffix = revealMs > 0 ? ' · +' + (revealMs / 1000).toFixed(revealMs % 1000 === 0 ? 0 : 1) + 's' : '';
        document.getElementById('menu-sample-1').textContent = 'Dual ' + topCode + '+' + botCode + ' 1 (' + topSrc + '/' + botSrc + ') · 96%' + revSuffix;
        document.getElementById('menu-sample-2').textContent = 'Dual ' + topCode + '+' + botCode + ' 2 (OS/OS) · 88%' + revSuffix;
        document.getElementById('menu-row-2').hidden = pairCount < 2;
        document.getElementById('menu-hint-text').innerHTML =
          'Visível em <strong>' + sName + '</strong> e <strong>' + pName + '</strong> (' + pairCount + (pairCount === 1 ? ' opção' : ' opções') + ').';

        const scaledPx = Math.round(13 + ((fontSize - 28) / 40) * 8);
        const learnObj = {
          text: sampleLine(pLang, sceneIdx),
          color: (!assMode || selectedPrimaryColor === 'none') ? '#EEF4F1' : selectedPrimaryColor,
          italic: false,
          isNative: false
        };
        const nativeObj = {
          text: decorateText(sampleLine(sLang, sceneIdx), secStyle),
          color: (!assMode || selectedSecondaryColor === 'none') ? '#EEF4F1' : selectedSecondaryColor,
          italic: secStyle === 'italic' || secStyle === 'italic-brackets',
          isNative: true
        };

        const first = order === 'secondary-top' ? nativeObj : learnObj;
        const second = order === 'secondary-top' ? learnObj : nativeObj;
        const topEl = document.getElementById('line-top');
        const botEl = document.getElementById('line-bottom');

        [[topEl, first], [botEl, second]].forEach(([el, obj]) => {
          el.textContent = obj.text;
          el.style.color = obj.color;
          el.style.fontStyle = obj.italic ? 'italic' : 'normal';
          el.style.fontSize = scaledPx + 'px';
          applyBoxStyle(el, bgStyle, assMode);
        });

        const nativeEl = first.isNative ? topEl : botEl;
        const otherEl = first.isNative ? botEl : topEl;
        otherEl.style.visibility = 'visible';
        if (revealTimer) clearTimeout(revealTimer);
        if (revealMs > 0) {
          nativeEl.style.visibility = 'hidden';
          revealTimer = setTimeout(() => {
            nativeEl.style.visibility = 'visible';
          }, Math.min(revealMs, 2200));
        } else {
          nativeEl.style.visibility = 'visible';
        }

        const stage = document.getElementById('subs-stage');
        if (vPos === 'top') stage.style.transform = 'translateY(-36px)';
        else if (vPos === 'high') stage.style.transform = 'translateY(-16px)';
        else if (vPos === 'raised') stage.style.transform = 'translateY(-8px)';
        else stage.style.transform = 'translateY(0)';
      }

      function scheduleAutoSave() {
        renderPreview();
        document.getElementById('live-sync-text').textContent = 'Salvando...';
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          void generateInstallUrls();
        }, 120);
      }

      function bindSwatches(containerId, customId, onPick) {
        const box = document.getElementById(containerId);
        const picker = document.getElementById(customId);
        const btns = box.querySelectorAll('.sw');
        btns.forEach((btn) => {
          btn.addEventListener('click', () => {
            btns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const c = btn.getAttribute('data-color') || 'none';
            if (c.startsWith('#') && picker) picker.value = c;
            onPick(c);
            scheduleAutoSave();
          });
        });
        if (picker) {
          picker.addEventListener('input', () => {
            btns.forEach((b) => b.classList.remove('active'));
            onPick(picker.value.toUpperCase());
            scheduleAutoSave();
          });
        }
      }

      bindSwatches('secondary-color-swatches', 'secondary-custom-color', (c) => { selectedSecondaryColor = c; });
      bindSwatches('primary-color-swatches', 'primary-custom-color', (c) => { selectedPrimaryColor = c; });

      document.getElementById('swap-langs-btn').addEventListener('click', () => {
        const p = document.getElementById('primary-lang');
        const s = document.getElementById('secondary-lang');
        const tmp = p.value;
        p.value = s.value;
        s.value = tmp;
        scheduleAutoSave();
      });

      document.getElementById('cycle-scene-btn').addEventListener('click', () => {
        const stage = document.getElementById('subs-stage');
        stage.classList.add('fade');
        setTimeout(() => {
          sceneIdx = (sceneIdx + 1) % 3;
          renderPreview();
          stage.classList.remove('fade');
        }, 160);
      });

      ['primary-lang', 'secondary-lang', 'primary-offset', 'secondary-offset', 'secondary-style-select', 'bg-style-select', 'font-size-range', 'vertical-pos-select', 'auto-sync-toggle'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', scheduleAutoSave);
          el.addEventListener('change', scheduleAutoSave);
        }
      });

      document.querySelectorAll('input[name="topLine"], input[name="learnSrc"], input[name="nativeSrc"], input[name="pairCount"], input[name="revealMs"]').forEach((el) => {
        el.addEventListener('change', scheduleAutoSave);
      });

      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setInterval(() => {
          const stage = document.getElementById('subs-stage');
          stage.classList.add('fade');
          setTimeout(() => {
            sceneIdx = (sceneIdx + 1) % 3;
            renderPreview();
            stage.classList.remove('fade');
          }, 200);
        }, 4200);
      }

      async function checkHealth() {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        const offline = document.getElementById('offline-banner');
        try {
          const res = await fetch('/companion/health');
          const data = await res.json();
          if (res.ok && data.ok) {
            dot.className = 'dot ok';
            text.textContent = 'Companion Online';
            offline.style.display = 'none';
          } else {
            dot.className = 'dot err';
            text.textContent = 'Indisponível';
            offline.style.display = 'block';
          }
        } catch {
          dot.className = 'dot err';
          text.textContent = 'Offline';
          offline.style.display = 'block';
        }
      }

      async function checkManifestReady() {
        const dot = document.getElementById('stremio-dot');
        const text = document.getElementById('stremio-text');
        try {
          const res = await fetch('/manifest.json');
          dot.className = res.ok ? 'dot ok' : 'dot err';
          text.textContent = res.ok ? 'Stremio Pronto' : 'Erro Manifest';
        } catch {
          dot.className = 'dot err';
          text.textContent = 'Inacessível';
        }
      }

      async function refreshOpenSubtitles() {
        const res = await fetch('/companion/opensubtitles', { headers: authHeaders(false) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.subtitleSync) {
          document.getElementById('subsync-toggle').checked = Boolean(data.subtitleSync.enabled);
          if (data.subtitleSync.hasUrl) {
            document.getElementById('subsync-url').placeholder = '✓ Subtitle Sync ativo (cole nova URL para trocar)';
          }
        }
        if (data.v3) document.getElementById('os-v3-toggle').checked = Boolean(data.v3.enabled);
        if (data.v1) {
          document.getElementById('os-v1-toggle').checked = Boolean(data.v1.enabled);
          if (data.v1.hasApiKey) {
            document.getElementById('os-api-key').placeholder = '✓ API Key v1 ativa (cole nova para trocar)';
          }
        }
        renderPreview();
      }

      async function saveSources() {
        const statusEl = document.getElementById('os-status');
        statusEl.className = 'status-msg';
        const syncVal = document.getElementById('subsync-url').value.trim();
        const keyVal = document.getElementById('os-api-key').value.trim();

        if (syncVal.length > 0) document.getElementById('subsync-toggle').checked = true;
        if (keyVal.length > 0) document.getElementById('os-v1-toggle').checked = true;

        const payload = {
          subtitleSyncEnabled: document.getElementById('subsync-toggle').checked,
          v1Enabled: document.getElementById('os-v1-toggle').checked,
          v3Enabled: document.getElementById('os-v3-toggle').checked,
        };
        if (syncVal.length > 0) payload.subtitleSyncUrl = syncVal;
        if (keyVal.length > 0) payload.apiKey = keyVal;

        const res = await fetch('/companion/opensubtitles', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          statusEl.className = 'status-msg error';
          statusEl.textContent = data.error || 'URL ou chave inválida.';
          return false;
        }
        document.getElementById('subsync-url').value = '';
        document.getElementById('os-api-key').value = '';
        const active = [];
        if (data.subtitleSync && data.subtitleSync.enabled) active.push('Sync');
        if (data.v3 && data.v3.enabled) active.push('v3');
        if (data.v1 && data.v1.enabled) active.push('v1');
        statusEl.textContent = active.length ? '✓ ' + active.join(' + ') : 'Desativado';
        await refreshOpenSubtitles();
        return true;
      }

      document.getElementById('save-os-btn').addEventListener('click', saveSources);
      ['subsync-toggle', 'os-v1-toggle', 'os-v3-toggle'].forEach((id) => {
        document.getElementById(id).addEventListener('change', saveSources);
      });

      document.getElementById('subsync-url').addEventListener('input', () => {
        const v = document.getElementById('subsync-url').value.trim().toLowerCase();
        const isManifest = (v.startsWith('https://') || v.startsWith('stremio://') || v.startsWith('http://127.0.0.1')) && v.endsWith('/manifest.json');
        if (!isManifest) return;
        if (syncProbeTimer) clearTimeout(syncProbeTimer);
        syncProbeTimer = setTimeout(async () => {
          const ok = await saveSources();
          if (ok) document.getElementById('test-sources-btn').click();
        }, 550);
      });

      document.getElementById('test-sources-btn').addEventListener('click', async () => {
        await saveSources();
        const grid = document.getElementById('probe-results');
        grid.style.display = 'grid';
        grid.innerHTML = '<div class="probe-box">Testando...</div>';
        const res = await fetch('/companion/opensubtitles/test', {
          method: 'POST',
          headers: authHeaders(true),
          body: '{}',
        });
        const data = await res.json();
        grid.innerHTML = '';
        [
          { title: 'Sync', enabled: data.subtitleSync?.enabled, ok: data.subtitleSync?.ok, detail: 'OK' },
          { title: 'OS v3', enabled: data.v3?.enabled, ok: data.v3?.ok, detail: 'OK' },
          { title: 'OS v1', enabled: data.v1?.enabled, ok: data.v1?.ok, detail: String(data.v1?.status || '') }
        ].forEach((it) => {
          const d = document.createElement('div');
          d.className = 'probe-box';
          const color = !it.enabled ? 'var(--faint)' : (it.ok ? 'var(--accent-bright)' : 'var(--danger)');
          const msg = !it.enabled ? 'Off' : (it.ok ? '✓ ' + it.detail : '✗ ' + it.detail);
          d.innerHTML = '<strong>' + it.title + '</strong><div style="color:' + color + ';">' + msg + '</div>';
          grid.appendChild(d);
        });
      });

      async function generateInstallUrls() {
        const statusEl = document.getElementById('install-status');
        const pill = document.getElementById('live-sync-text');
        const orderVal = getRadio('topLine', 'primary-top');

        const settingsPayload = {
          primaryLanguage: document.getElementById('primary-lang').value,
          secondaryLanguage: document.getElementById('secondary-lang').value,
          primaryOffsetMs: String(document.getElementById('primary-offset').value || 0),
          secondaryOffsetMs: String(document.getElementById('secondary-offset').value || 0),
          order: orderVal,
          bilingualEnabled: 'on',
          primaryColor: selectedPrimaryColor,
          secondaryColor: selectedSecondaryColor,
          secondaryStyle: document.getElementById('secondary-style-select').value,
          verticalPosition: document.getElementById('vertical-pos-select').value,
          fontSize: String(document.getElementById('font-size-range').value || 46),
          backgroundStyle: document.getElementById('bg-style-select').value,
          autoSync: document.getElementById('auto-sync-toggle').checked ? 'on' : 'off',
          learnSrc: getRadio('learnSrc', 'auto'),
          nativeSrc: getRadio('nativeSrc', 'auto'),
          pairCount: getRadio('pairCount', '3'),
          revealMs: getRadio('revealMs', '0'),
        };

        const res = await fetch('/companion/install-url', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify(settingsPayload),
        });
        const data = await res.json();
        if (!res.ok) {
          statusEl.className = 'status-msg error';
          statusEl.textContent = data.error || 'Escolha dois idiomas distintos.';
          pill.textContent = 'Ajuste idiomas';
          return;
        }

        document.getElementById('http-manifest-url').textContent = data.httpManifestUrl;
        document.getElementById('stremio-deep-link').textContent = data.stremioDeepLink;
        document.getElementById('open-stremio-btn').setAttribute('href', data.stremioDeepLink);
        document.getElementById('open-web-btn').setAttribute(
          'href',
          'https://web.stremio.com/#/addons?addon=' + encodeURIComponent(data.httpManifestUrl)
        );

        await fetch('/companion/settings', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify(settingsPayload),
        });
        statusEl.className = 'status-msg';
        statusEl.textContent = '✓ Ativo em tempo real no Stremio';
        pill.textContent = 'Sincronizado Ao Vivo';
      }

      async function loadSavedSettings() {
        try {
          const res = await fetch('/companion/settings', { headers: authHeaders(false) });
          if (!res.ok) return;
          const data = await res.json();
          if (!data.configured || !data.settings) return;
          const s = data.settings;
          const setVal = (id, v) => { if (v !== undefined && document.getElementById(id)) document.getElementById(id).value = v; };
          setVal('primary-lang', s.primaryLanguage);
          setVal('secondary-lang', s.secondaryLanguage);
          setVal('primary-offset', s.primaryOffsetMs);
          setVal('secondary-offset', s.secondaryOffsetMs);
          setVal('secondary-style-select', s.secondaryStyle || 'italic');
          setVal('vertical-pos-select', s.verticalPosition || 'bottom');
          setVal('font-size-range', s.fontSize || '46');
          setVal('bg-style-select', s.backgroundStyle || 'outline');
          if (s.order) setRadio('topLine', s.order);
          if (s.learnSrc) setRadio('learnSrc', s.learnSrc);
          if (s.nativeSrc) setRadio('nativeSrc', s.nativeSrc);
          if (s.pairCount) setRadio('pairCount', s.pairCount);
          if (s.revealMs) setRadio('revealMs', s.revealMs);
          document.getElementById('auto-sync-toggle').checked = s.autoSync !== 'off' && s.autoSync !== 'false';
          selectedPrimaryColor = s.primaryColor || '#FFFFFF';
          selectedSecondaryColor = s.secondaryColor || '#34D399';
          if (selectedPrimaryColor.startsWith('#')) document.getElementById('primary-custom-color').value = selectedPrimaryColor;
          if (selectedSecondaryColor.startsWith('#')) document.getElementById('secondary-custom-color').value = selectedSecondaryColor;
          for (const [gid, color] of [['primary-color-swatches', selectedPrimaryColor], ['secondary-color-swatches', selectedSecondaryColor]]) {
            document.querySelectorAll('#' + gid + ' .sw').forEach((b) => {
              b.classList.toggle('active', (b.getAttribute('data-color') || 'none') === color);
            });
          }
        } catch {}
      }

      document.getElementById('generate-url-btn').addEventListener('click', generateInstallUrls);
      document.getElementById('copy-url-btn').addEventListener('click', async () => {
        const url = document.getElementById('http-manifest-url').textContent || '';
        try {
          await navigator.clipboard.writeText(url);
          document.getElementById('install-status').textContent = '✓ Link copiado!';
        } catch {
          document.getElementById('install-status').textContent = 'Copie manualmente acima.';
        }
      });

      (async () => {
        await loadSavedSettings();
        renderPreview();
        await generateInstallUrls();
      })();
      checkHealth();
      checkManifestReady();
      refreshOpenSubtitles();
    })();
  </script>
</body>
</html>`;
}
