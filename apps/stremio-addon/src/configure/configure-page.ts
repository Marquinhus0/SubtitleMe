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
 * Renders the Modern DualSubs Studio configuration & Local Companion UI served at `/configure`.
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
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="subtitleme-token" content="${safeToken}" />
  <title>SubtitleMe — Stremio Local Companion Studio</title>
  <style>
    :root {
      --bg: #07090F;
      --bg-glow: radial-gradient(circle at 18% 0%, rgba(139, 124, 255, 0.16), transparent 42%),
                 radial-gradient(circle at 82% 8%, rgba(54, 207, 201, 0.12), transparent 40%);
      --surface: rgba(20, 25, 36, 0.88);
      --surface-elevated: #1A2130;
      --surface-soft: #121723;
      --primary: #8B7CFF;
      --primary-hover: #9F92FF;
      --secondary: #36CFC9;
      --text: #F4F6FB;
      --muted: #9BA5BC;
      --border: rgba(255, 255, 255, 0.09);
      --border-strong: rgba(139, 124, 255, 0.45);
      --danger: #FF5C77;
      --success: #36CFC9;
      --warning: #FFD60A;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background-color: var(--bg);
      background-image: var(--bg-glow);
      color: var(--text);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
      min-height: 100vh;
    }
    .container {
      max-width: 1120px;
      margin: 0 auto;
      padding: 28px 20px 72px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      display: grid;
      place-items: center;
      font-weight: 900;
      font-size: 1.15rem;
      color: #07090F;
      box-shadow: 0 8px 24px rgba(139, 124, 255, 0.32);
    }
    h1 { margin: 0; font-size: 1.55rem; letter-spacing: -0.025em; }
    .tagline { color: var(--muted); font-size: 0.9rem; margin-top: 2px; }
    .badges { display: flex; gap: 10px; flex-wrap: wrap; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 13px;
      border-radius: 999px;
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      font-size: 0.82rem;
      font-weight: 600;
    }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--muted); }
    .dot.ok { background: var(--success); box-shadow: 0 0 8px var(--success); }
    .dot.err { background: var(--danger); }

    .studio-layout {
      display: grid;
      grid-template-columns: 1.18fr 0.82fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 920px) {
      .studio-layout { grid-template-columns: 1fr; }
      .sticky-col { position: static !important; }
    }
    .sticky-col {
      position: sticky;
      top: 20px;
    }

    .notice {
      background: rgba(139, 124, 255, 0.1);
      border: 1px solid rgba(139, 124, 255, 0.32);
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 0.86rem;
      color: var(--text);
      margin-bottom: 18px;
    }
    .card {
      background: var(--surface);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
    }
    .card h2 {
      margin: 0 0 12px;
      font-size: 1.04rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .step-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: rgba(139, 124, 255, 0.2);
      color: var(--primary);
      font-size: 0.78rem;
      font-weight: 800;
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
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) { .two-col { grid-template-columns: 1fr; } }

    label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .checkbox-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--text);
      margin-bottom: 10px;
      padding: 9px 11px;
      border-radius: 10px;
      background: var(--surface-soft);
      border: 1px solid var(--border);
      cursor: pointer;
    }
    .checkbox-row input { margin-top: 3px; accent-color: var(--primary); }

    input[type="text"], input[type="password"], input[type="number"], select, input[type="file"] {
      width: 100%;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface-elevated);
      color: var(--text);
      font-size: 0.9rem;
      margin-bottom: 12px;
      outline: none;
      transition: border-color 0.15s ease;
    }
    input:focus, select:focus { border-color: var(--primary); }

    button, .btn-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: var(--primary);
      color: #07090F;
      font-weight: 700;
      border: none;
      border-radius: 10px;
      padding: 10px 15px;
      cursor: pointer;
      font-size: 0.88rem;
      text-decoration: none;
      transition: transform 0.1s ease, background 0.15s ease;
    }
    button:hover, .btn-link:hover { background: var(--primary-hover); }
    button:active, .btn-link:active { transform: scale(0.98); }
    button.secondary, .btn-link.secondary {
      background: var(--surface-elevated);
      color: var(--text);
      border: 1px solid var(--border);
    }
    button.chip {
      padding: 5px 10px;
      font-size: 0.78rem;
      border-radius: 999px;
      background: var(--surface-elevated);
      color: var(--muted);
      border: 1px solid var(--border);
    }
    button.chip.active, button.chip:hover {
      color: var(--text);
      border-color: var(--primary);
      background: rgba(139, 124, 255, 0.18);
    }
    button.danger {
      background: transparent;
      color: var(--danger);
      border: 1px solid rgba(255, 92, 119, 0.45);
      padding: 6px 11px;
      font-size: 0.8rem;
    }

    .swatches {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .swatch {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 2px solid var(--border);
      cursor: pointer;
      padding: 0;
      position: relative;
    }
    .swatch.active {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(139, 124, 255, 0.45);
    }
    .swatch-auto {
      background: linear-gradient(135deg, #2A3246, #141925);
      color: var(--text);
      font-size: 0.68rem;
      font-weight: 800;
    }

    /* Live Cinema Player Preview */
    .cinema-screen {
      position: relative;
      height: 235px;
      border-radius: 14px;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(7, 9, 15, 0.25) 0%, rgba(7, 9, 15, 0.85) 100%),
        radial-gradient(circle at 50% 35%, #27344F 0%, #0E1320 68%, #07090F 100%);
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 18px;
      margin-bottom: 14px;
    }
    .cinema-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      font-size: 0.72rem;
      padding: 4px 9px;
      border-radius: 999px;
      background: rgba(7, 9, 15, 0.72);
      border: 1px solid var(--border);
      color: var(--muted);
    }
    .cinema-delay-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 0.72rem;
      padding: 4px 9px;
      border-radius: 999px;
      background: rgba(54, 207, 201, 0.16);
      border: 1px solid rgba(54, 207, 201, 0.4);
      color: var(--secondary);
      font-weight: 700;
    }
    .cinema-subs-wrap {
      width: 100%;
      text-align: center;
      transition: transform 0.2s ease;
    }
    .cinema-sub-line {
      display: block;
      font-size: 1.04rem;
      font-weight: 600;
      line-height: 1.38;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95), 0 0 2px #000;
    }
    .cinema-bar {
      margin-top: 12px;
      height: 4px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      overflow: hidden;
    }
    .cinema-bar > span {
      display: block;
      width: 38%;
      height: 100%;
      background: var(--primary);
    }

    .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .status-msg { font-size: 0.83rem; margin-top: 8px; min-height: 1.2em; color: var(--secondary); }
    .status-msg.error { color: var(--danger); }
    .url-box {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      word-break: break-all;
      background: var(--surface-soft);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      margin: 8px 0;
      color: var(--muted);
    }
    .hint { font-size: 0.79rem; color: var(--muted); margin: 4px 0; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 8px;
      margin: 10px 0;
    }
    .metric {
      background: var(--surface-soft);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 11px;
    }
    .metric-label { font-size: 0.73rem; color: var(--muted); }
    .metric-val { font-size: 0.92rem; font-weight: 700; margin-top: 2px; }
    .preview-stage {
      background: var(--surface-soft);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      min-height: 70px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 8px;
      justify-content: center;
    }
    .cue-box {
      background: rgba(7, 9, 15, 0.85);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      white-space: pre-line;
      font-size: 0.88rem;
    }
    .cue-time { font-size: 0.72rem; color: var(--muted); margin-bottom: 3px; }
    .track-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    .track-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 0.84rem;
    }
    details summary {
      cursor: pointer;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 4px 0;
      color: var(--text);
    }
  </style>
</head>
<body>
  <main class="container">
    <header>
      <div class="brand">
        <div class="brand-logo">SM</div>
        <div>
          <h1>SubtitleMe Studio</h1>
          <div class="tagline">Two languages. One experience — Stremio Local Companion</div>
        </div>
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

    <section class="notice" id="offline-banner" role="alert" style="display:none; border-color: rgba(255,92,119,0.55); background: rgba(255,92,119,0.12);">
      <strong>Companion Offline:</strong> Não foi possível conectar a <code>127.0.0.1</code>. Inicie com <code>.\\bin\\start-companion.cmd</code> (Windows) ou <code>./bin/start-companion.sh</code> (Linux) e recarregue esta página.
    </section>

    <div class="studio-layout">
      <!-- LEFT COLUMN: CONFIGURATION STEPS -->
      <div>
        <!-- STEP 1: AUTOMATIC SOURCES & SUBTITLE SYNC -->
        <section class="card" id="opensubtitles-card">
          <div class="card-header">
            <h2><span class="step-pill">1</span> Fontes Automáticas &amp; Subtitle Sync</h2>
          </div>
          <p class="hint" style="margin-bottom:12px;">
            Combine qualquer provedor abaixo para buscar e sincronizar automaticamente as duas legendas em qualquer filme ou série do Stremio (prioridade: Arquivos Locais &rarr; Subtitle Sync &rarr; OpenSubtitles v1 &rarr; OpenSubtitles v3).
          </p>

          <label class="checkbox-row">
            <input type="checkbox" id="subsync-toggle" />
            <div>
              <strong>Usar Subtitle Sync (<code>subtitlesync.stream</code>) ou Addon Stremio Externo</strong>
              <div class="hint">Ideal para sincronia perfeita de FPS/cortes! Cole abaixo seu link configurado do Subtitle Sync.</div>
            </div>
          </label>
          <input type="password" id="subsync-url" placeholder="https://subtitlesync.stream/.../manifest.json (mantido apenas na memória local)" autocomplete="off" />

          <label class="checkbox-row">
            <input type="checkbox" id="os-v1-toggle" />
            <div>
              <strong>OpenSubtitles REST API v1 (<code>api.opensubtitles.com/api/v1</code>)</strong>
              <div class="hint">Com matching inteligente de <code>moviehash</code>, release (WEB-DL vs BluRay) e episódio (<code>parent_imdb_id</code>).</div>
            </div>
          </label>
          <input type="password" id="os-api-key" placeholder="Cole sua API Key da api.opensubtitles.com (nunca gravada em log)" autocomplete="off" />

          <label class="checkbox-row">
            <input type="checkbox" id="os-v3-toggle" />
            <div>
              <strong>Stremio OpenSubtitles v3 (Sem API Key)</strong>
              <div class="hint">Busca por hash exato do vídeo com fallback automático por IMDb ID.</div>
            </div>
          </label>

          <div class="row">
            <button type="button" id="save-os-btn">Salvar Fontes Automáticas</button>
          </div>
          <div class="status-msg" id="os-status" aria-live="polite"></div>
        </section>

        <!-- STEP 2: LANGUAGES, AUTO-SYNC & LEARNER DELAY -->
        <section class="card">
          <div class="card-header">
            <h2><span class="step-pill">2</span> Idiomas, Sincronia &amp; Modo Aprendizado</h2>
            <button type="button" class="secondary" id="swap-langs-btn" style="padding:6px 11px; font-size:0.8rem;">&#8644; Inverter Idiomas</button>
          </div>

          <div class="two-col">
            <div>
              <label for="primary-lang">1º Idioma (Principal / Aprendizado)</label>
              <select id="primary-lang">${primaryOptionsHtml}</select>
            </div>
            <div>
              <label for="secondary-lang">2º Idioma (Tradução / Apoio)</label>
              <select id="secondary-lang">${secondaryOptionsHtml}</select>
            </div>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" id="auto-sync-toggle" checked />
            <div>
              <strong>Auto-Sync Inteligente entre os 2 Idiomas (Recomendado)</strong>
              <div class="hint">Alinha automaticamente diferenças de intro/corte (até ±20s) e taxa de quadros (23.976 &harr; 25 fps) da 2ª legenda com a 1ª, além de disponibilizar a versão original como opção reserva no player.</div>
            </div>
          </label>

          <label>Delay do Modo Aprendizado (atrasar 2º idioma para treinar escuta/leitura)</label>
          <div class="row" style="margin-bottom:12px;">
            <button type="button" class="chip active" data-delay="0">0s (Simultâneo)</button>
            <button type="button" class="chip" data-delay="1000">+1.0s Delay</button>
            <button type="button" class="chip" data-delay="1500">+1.5s Delay</button>
            <button type="button" class="chip" data-delay="2000">+2.0s Delay</button>
          </div>

          <div class="two-col">
            <div>
              <label for="primary-offset">Ajuste fino 1º idioma (ms)</label>
              <input type="number" id="primary-offset" min="-30000" max="30000" step="100" value="0" />
            </div>
            <div>
              <label for="secondary-offset">Ajuste fino 2º idioma (ms)</label>
              <input type="number" id="secondary-offset" min="-30000" max="30000" step="100" value="0" />
            </div>
          </div>
        </section>

        <!-- STEP 3: VISUAL SUBTITLE CUSTOMIZATION -->
        <section class="card">
          <h2><span class="step-pill">3</span> Personalização Visual das Legendas</h2>

          <label>Cor da 1ª Legenda (Principal)</label>
          <div class="swatches" id="primary-color-swatches">
            <button type="button" class="swatch swatch-auto active" data-color="none" title="Padrão do Player">AUTO</button>
            <button type="button" class="swatch" data-color="#FFFFFF" style="background:#FFFFFF" title="Branco Puro"></button>
            <button type="button" class="swatch" data-color="#FFD60A" style="background:#FFD60A" title="Amarelo Cinema"></button>
            <button type="button" class="swatch" data-color="#36CFC9" style="background:#36CFC9" title="Ciano"></button>
            <button type="button" class="swatch" data-color="#73D13D" style="background:#73D13D" title="Verde"></button>
            <button type="button" class="swatch" data-color="#8B7CFF" style="background:#8B7CFF" title="Violeta"></button>
          </div>

          <label>Cor da 2ª Legenda (Secundária — destaque visual imediato)</label>
          <div class="swatches" id="secondary-color-swatches">
            <button type="button" class="swatch swatch-auto" data-color="none" title="Padrão do Player">AUTO</button>
            <button type="button" class="swatch active" data-color="#FFD60A" style="background:#FFD60A" title="Amarelo Cinema (Recomendado)"></button>
            <button type="button" class="swatch" data-color="#36CFC9" style="background:#36CFC9" title="Ciano"></button>
            <button type="button" class="swatch" data-color="#CBD5E1" style="background:#CBD5E1" title="Prata Suave"></button>
            <button type="button" class="swatch" data-color="#FFA940" style="background:#FFA940" title="Âmbar"></button>
            <button type="button" class="swatch" data-color="#FF85C0" style="background:#FF85C0" title="Rosa"></button>
            <button type="button" class="swatch" data-color="#FFFFFF" style="background:#FFFFFF" title="Branco"></button>
          </div>

          <div class="two-col">
            <div>
              <label for="secondary-style-select">Estilo da 2ª Legenda</label>
              <select id="secondary-style-select">
                <option value="italic" selected>Itálico (Recomendado)</option>
                <option value="none">Normal (Sem formatação extra)</option>
                <option value="brackets">[Entre Colchetes]</option>
                <option value="italic-brackets">Itálico + [Entre Colchetes]</option>
              </select>
            </div>
            <div>
              <label for="order-select">Ordem das Linhas</label>
              <select id="order-select">
                <option value="primary-top" selected>1º Idioma no Topo / 2º Abaixo</option>
                <option value="secondary-top">2º Idioma no Topo / 1º Abaixo</option>
              </select>
            </div>
          </div>

          <div class="two-col">
            <div>
              <label for="vertical-pos-select">Posição Vertical na Tela (WebVTT)</label>
              <select id="vertical-pos-select">
                <option value="bottom" selected>Padrão (Base do Vídeo)</option>
                <option value="raised">Levemente Elevada (84%)</option>
                <option value="high">Alta — Acima de Barras (72%)</option>
                <option value="top">Topo da Tela (12%)</option>
              </select>
            </div>
            <div>
              <label for="output-format-select">Formato de Entrega ao Stremio</label>
              <select id="output-format-select">
                <option value="vtt" selected>WebVTT (.vtt — Suporta Posição &amp; Cores)</option>
                <option value="srt">SubRip (.srt — Compatibilidade Clássica)</option>
              </select>
            </div>
          </div>
        </section>

        <!-- OPTIONAL: LOCAL SUBTITLES & PERSISTENCE -->
        <section class="card" id="storage-card" hidden>
          <details>
            <summary>Opções Avançadas: Upload Manual (.SRT / .VTT) &amp; Persistência Local</summary>
            <div style="margin-top:14px;">
              <p class="hint" style="margin-bottom:12px;">
                100% Local Processing: arquivos enviados manualmente permanecem exclusivamente em <code>127.0.0.1</code> e têm prioridade máxima sobre buscas externas.
              </p>

              <div class="card-header">
                <label class="checkbox-row" style="margin:0; flex:1;">
                  <input type="checkbox" id="persistence-toggle" />
                  <span>Salvar legendas locais em disco (manter após reiniciar o Companion)</span>
                </label>
                <button type="button" class="danger" id="clear-library-btn">Limpar Biblioteca</button>
              </div>

              <div class="metrics">
                <div class="metric">
                  <div class="metric-label">Modo</div>
                  <div class="metric-val" id="storage-mode">Memory only</div>
                </div>
                <div class="metric">
                  <div class="metric-label">Uso de Disco</div>
                  <div class="metric-val" id="storage-used">0 KB</div>
                </div>
                <div class="metric">
                  <div class="metric-label">Arquivos</div>
                  <div class="metric-val" id="storage-count">0</div>
                </div>
                <div class="metric">
                  <div class="metric-label">Recuperados</div>
                  <div class="metric-val" id="storage-recovered">0</div>
                </div>
              </div>
              <div class="hint" id="storage-dir">Storage directory: controlled private app folder</div>
              <div class="status-msg" id="storage-status" aria-live="polite"></div>

              <hr style="border:none; border-top:1px solid var(--border); margin:14px 0;" />

              <label for="content-id">Stremio Content ID (ex.: <code>tt1254207</code> ou <code>tt0903747:1:1</code>)</label>
              <input type="text" id="content-id" value="tt1254207" placeholder="tt1254207" autocomplete="off" />

              <div class="two-col">
                <div>
                  <label for="primary-file">Arquivo 1º Idioma (.srt/.vtt)</label>
                  <input type="file" id="primary-file" accept=".srt,.vtt" />
                  <button type="button" class="secondary" id="upload-primary-btn">Enviar 1ª Legenda</button>
                  <div class="status-msg" id="primary-status" aria-live="polite"></div>
                </div>
                <div>
                  <label for="secondary-file">Arquivo 2º Idioma (.srt/.vtt)</label>
                  <input type="file" id="secondary-file" accept=".srt,.vtt" />
                  <button type="button" class="secondary" id="upload-secondary-btn">Enviar 2ª Legenda</button>
                  <div class="status-msg" id="secondary-status" aria-live="polite"></div>
                </div>
              </div>

              <div style="margin-top:12px;">
                <div class="row" style="justify-content:space-between; margin-bottom:8px;">
                  <strong style="font-size:0.86rem;">Legendas Locais Registradas</strong>
                  <button type="button" class="secondary" id="preview-btn" style="padding:6px 11px; font-size:0.78rem;">Testar Preview de Cues Locais</button>
                </div>
                <ul class="track-list" id="track-list">
                  <li class="hint">Nenhuma legenda local enviada.</li>
                </ul>
                <div class="preview-stage" id="preview-stage" aria-live="polite" style="margin-top:10px;">
                  <span class="hint">Envie legendas locais para o mesmo Content ID se quiser testar o merge de arquivos locais.</span>
                </div>
              </div>
            </div>
          </details>
        </section>
      </div>

      <!-- RIGHT COLUMN: STICKY LIVE CINEMA PREVIEW + 1-CLICK STREMIO INSTALL -->
      <div class="sticky-col">
        <section class="card">
          <h2>Pré-visualização Ao Vivo no Player</h2>
          <div class="cinema-screen" id="cinema-screen">
            <span class="cinema-badge" id="cinema-pair-badge">EN + PT-BR</span>
            <span class="cinema-delay-badge" id="cinema-sync-badge">Auto-Sync ON</span>
            <div class="cinema-subs-wrap" id="cinema-subs-wrap">
              <span class="cinema-sub-line" id="cinema-line-top">Everything that has a beginning has an end.</span>
              <span class="cinema-sub-line" id="cinema-line-bottom" style="color:#FFD60A; font-style:italic;">Tudo o que tem um começo tem um fim.</span>
            </div>
            <div class="cinema-bar"><span></span></div>
          </div>
          <p class="hint">
            As cores, itálico, colchetes, ordem e delay escolhidos ao lado são embutidos diretamente na URL do seu addon no Stremio!
          </p>
        </section>

        <section class="card" style="border-color: var(--border-strong);">
          <h2><span class="step-pill">4</span> Instalar / Atualizar no Stremio</h2>
          <p class="hint" style="margin-bottom:12px;">
            Sempre que mudar idiomas, cores ou sincronia, reinstale o link atualizado abaixo no Stremio Desktop (remova a versão anterior em <em>Addons</em> para evitar duplicatas).
          </p>
          <div class="row" style="margin-bottom:10px;">
            <a class="btn-link" id="open-stremio-btn" href="${safeBaseUrl.replace(/^http:\/\//i, 'stremio://')}/manifest.json">Instalar Direto no Stremio</a>
            <button type="button" class="secondary" id="copy-url-btn">Copiar Link Manifest</button>
            <button type="button" class="secondary" id="generate-url-btn" style="padding:10px 11px;" title="Atualizar URL">&#8635;</button>
          </div>
          <label>Manifest URL (para colar em Addons &rarr; + Add Addon)</label>
          <div class="url-box" id="http-manifest-url">${safeBaseUrl}/manifest.json</div>
          <div class="url-box" id="stremio-deep-link" style="display:none;">${safeBaseUrl.replace(/^http:\/\//i, 'stremio://')}/manifest.json</div>
          <div class="status-msg" id="install-status" aria-live="polite"></div>
        </section>
      </div>
    </div>
  </main>

  <script>
    (function () {
      const tokenMeta = document.querySelector('meta[name="subtitleme-token"]');
      const sessionToken = tokenMeta ? tokenMeta.getAttribute('content') || '' : '';

      let selectedPrimaryColor = 'none';
      let selectedSecondaryColor = '#FFD60A';

      const SAMPLE_LINES = {
        'en': 'Everything that has a beginning has an end.',
        'pt-BR': 'Tudo o que tem um começo tem um fim.',
        'es': 'Todo lo que tiene un principio tiene un final.',
        'fr': 'Tout ce qui a un début a une fin.',
        'de': 'Alles, was einen Anfang hat, hat auch ein Ende.',
        'it': 'Tutto ciò che ha un inizio ha una fine.',
        'ja': '始まりあるものには全て終わりがある。'
      };

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

      function decoratePreviewText(text, style) {
        let out = text;
        if (style === 'brackets' || style === 'italic-brackets') {
          out = '[' + out + ']';
        }
        return out;
      }

      function updateLiveCinemaPreview() {
        const pLang = document.getElementById('primary-lang').value;
        const sLang = document.getElementById('secondary-lang').value;
        const order = document.getElementById('order-select').value;
        const secStyle = document.getElementById('secondary-style-select').value;
        const vPos = document.getElementById('vertical-pos-select').value;
        const autoSync = document.getElementById('auto-sync-toggle').checked;
        const secOffset = Number(document.getElementById('secondary-offset').value || 0);

        document.getElementById('cinema-pair-badge').textContent = pLang.toUpperCase() + ' + ' + sLang.toUpperCase();

        const badgeParts = [];
        if (autoSync) badgeParts.push('Auto-Sync ON');
        if (secOffset !== 0) badgeParts.push((secOffset > 0 ? '+' : '') + (secOffset / 1000).toFixed(1) + 's');
        document.getElementById('cinema-sync-badge').textContent = badgeParts.length ? badgeParts.join(' • ') : 'Sync Padrão';

        const pObj = {
          text: SAMPLE_LINES[pLang] || SAMPLE_LINES['en'],
          color: selectedPrimaryColor === 'none' ? '#FFFFFF' : selectedPrimaryColor,
          italic: false
        };
        const sObj = {
          text: decoratePreviewText(SAMPLE_LINES[sLang] || SAMPLE_LINES['pt-BR'], secStyle),
          color: selectedSecondaryColor === 'none' ? '#FFFFFF' : selectedSecondaryColor,
          italic: secStyle === 'italic' || secStyle === 'italic-brackets'
        };

        const first = order === 'secondary-top' ? sObj : pObj;
        const second = order === 'secondary-top' ? pObj : sObj;

        const topEl = document.getElementById('cinema-line-top');
        const botEl = document.getElementById('cinema-line-bottom');
        topEl.textContent = first.text;
        topEl.style.color = first.color;
        topEl.style.fontStyle = first.italic ? 'italic' : 'normal';

        botEl.textContent = second.text;
        botEl.style.color = second.color;
        botEl.style.fontStyle = second.italic ? 'italic' : 'normal';

        const wrap = document.getElementById('cinema-subs-wrap');
        if (vPos === 'top') wrap.style.transform = 'translateY(-125px)';
        else if (vPos === 'high') wrap.style.transform = 'translateY(-42px)';
        else if (vPos === 'raised') wrap.style.transform = 'translateY(-18px)';
        else wrap.style.transform = 'translateY(0)';
      }

      function setupSwatchGroup(containerId, onSelect) {
        const container = document.getElementById(containerId);
        const buttons = container.querySelectorAll('.swatch');
        buttons.forEach((btn) => {
          btn.addEventListener('click', () => {
            buttons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            onSelect(btn.getAttribute('data-color') || 'none');
            updateLiveCinemaPreview();
            generateInstallUrls();
          });
        });
      }

      setupSwatchGroup('primary-color-swatches', (c) => { selectedPrimaryColor = c; });
      setupSwatchGroup('secondary-color-swatches', (c) => { selectedSecondaryColor = c; });

      document.querySelectorAll('[data-delay]').forEach((chip) => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('[data-delay]').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          document.getElementById('secondary-offset').value = chip.getAttribute('data-delay') || '0';
          updateLiveCinemaPreview();
          generateInstallUrls();
        });
      });

      document.getElementById('swap-langs-btn').addEventListener('click', () => {
        const pEl = document.getElementById('primary-lang');
        const sEl = document.getElementById('secondary-lang');
        const tmp = pEl.value;
        pEl.value = sEl.value;
        sEl.value = tmp;
        updateLiveCinemaPreview();
        generateInstallUrls();
      });

      ['primary-lang', 'secondary-lang', 'primary-offset', 'secondary-offset', 'order-select', 'secondary-style-select', 'vertical-pos-select', 'output-format-select', 'auto-sync-toggle'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', () => {
            updateLiveCinemaPreview();
            generateInstallUrls();
          });
        }
      });

      async function checkHealth() {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        const offlineBanner = document.getElementById('offline-banner');
        try {
          const res = await fetch('/companion/health');
          const data = await res.json();
          if (res.ok && data.ok) {
            dot.className = 'dot ok';
            text.textContent = 'Companion Ativo (127.0.0.1) — ' + data.registeredSubtitles + ' local(is)';
            if (offlineBanner) offlineBanner.style.display = 'none';
          } else {
            dot.className = 'dot err';
            text.textContent = 'Companion Indisponível';
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
            text.textContent = 'Manifest Stremio Pronto';
          } else {
            dot.className = 'dot err';
            text.textContent = 'Erro no Manifest';
          }
        } catch {
          dot.className = 'dot err';
          text.textContent = 'Manifest Inacessível';
        }
      }

      async function refreshOpenSubtitles() {
        const res = await fetch('/companion/opensubtitles', { headers: authHeaders(false) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.subtitleSync) {
          document.getElementById('subsync-toggle').checked = Boolean(data.subtitleSync.enabled);
          if (data.subtitleSync.hasUrl) {
            document.getElementById('subsync-url').placeholder = 'Subtitle Sync ativo na memória (cole nova URL se quiser substituir)';
          }
        }
        if (data.v3) {
          document.getElementById('os-v3-toggle').checked = Boolean(data.v3.enabled);
        }
        if (data.v1) {
          document.getElementById('os-v1-toggle').checked = Boolean(data.v1.enabled);
          if (data.v1.hasApiKey) {
            document.getElementById('os-api-key').placeholder = 'API Key ativa na memória (cole nova chave se quiser substituir)';
          }
        }
      }

      document.getElementById('save-os-btn').addEventListener('click', async () => {
        const statusEl = document.getElementById('os-status');
        statusEl.className = 'status-msg';
        const subtitleSyncUrlVal = document.getElementById('subsync-url').value.trim();
        const apiKeyVal = document.getElementById('os-api-key').value.trim();

        // Auto-check toggles if user pasted a new URL or key!
        if (subtitleSyncUrlVal.length > 0) document.getElementById('subsync-toggle').checked = true;
        if (apiKeyVal.length > 0) document.getElementById('os-v1-toggle').checked = true;

        const payload = {
          subtitleSyncEnabled: document.getElementById('subsync-toggle').checked,
          v1Enabled: document.getElementById('os-v1-toggle').checked,
          v3Enabled: document.getElementById('os-v3-toggle').checked,
        };
        if (subtitleSyncUrlVal.length > 0) payload.subtitleSyncUrl = subtitleSyncUrlVal;
        if (apiKeyVal.length > 0) payload.apiKey = apiKeyVal;

        const res = await fetch('/companion/opensubtitles', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          statusEl.className = 'status-msg error';
          statusEl.textContent = data.error || 'Falha ao salvar fontes automáticas.';
          return;
        }
        document.getElementById('subsync-url').value = '';
        document.getElementById('os-api-key').value = '';
        const modes = [];
        if (data.subtitleSync && data.subtitleSync.enabled) modes.push('Subtitle Sync ATIVO');
        if (data.v1 && data.v1.enabled) modes.push('OpenSubtitles v1 ATIVO');
        if (data.v3 && data.v3.enabled) modes.push('OpenSubtitles v3 ATIVO');
        statusEl.textContent = modes.length > 0
          ? 'Salvo: ' + modes.join(' + ') + '!'
          : 'Fontes externas desativadas (modo somente arquivos locais).';
        await refreshOpenSubtitles();
      });

      async function refreshStorage() {
        const res = await fetch('/companion/storage', { headers: authHeaders(false) });
        if (!res.ok) return;
        const data = await res.json();
        const s = data.storage;
        if (!s) return;
        document.getElementById('persistence-toggle').checked = Boolean(s.enabled);
        document.getElementById('storage-mode').textContent = s.enabled ? 'Disco Local' : 'Memória';
        document.getElementById('storage-used').textContent = formatBytes(s.usedBytes) + ' / ' + formatBytes(s.maxBytes);
        document.getElementById('storage-count').textContent = String(s.trackCount);
        document.getElementById('storage-recovered').textContent = String(s.recoveredCount);
        document.getElementById('storage-dir').textContent = 'Pasta: ' + s.dataDir;
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
          empty.textContent = 'Nenhuma legenda local enviada.';
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
          delBtn.textContent = 'Remover';
          delBtn.addEventListener('click', async () => {
            if (!window.confirm('Remover legenda "' + item.filename + '" (' + item.contentId + ')?')) return;
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
          statusEl.textContent = 'Selecione um arquivo .srt ou .vtt.';
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
          statusEl.textContent = data.error || 'Falha no envio.';
          return;
        }
        statusEl.textContent = 'Salvo: ' + data.subtitle.filename + ' (' + data.subtitle.cueCount + ' cues).';
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
          err.textContent = data.error || 'Não foi possível gerar preview.';
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
        const settingsPayload = {
          primaryLanguage: document.getElementById('primary-lang').value,
          secondaryLanguage: document.getElementById('secondary-lang').value,
          primaryOffsetMs: String(document.getElementById('primary-offset').value || 0),
          secondaryOffsetMs: String(document.getElementById('secondary-offset').value || 0),
          order: document.getElementById('order-select').value,
          bilingualEnabled: 'on',
          primaryColor: selectedPrimaryColor,
          secondaryColor: selectedSecondaryColor,
          secondaryStyle: document.getElementById('secondary-style-select').value,
          verticalPosition: document.getElementById('vertical-pos-select').value,
          autoSync: document.getElementById('auto-sync-toggle').checked ? 'on' : 'off',
          outputFormat: document.getElementById('output-format-select').value,
        };
        const res = await fetch('/companion/install-url', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify(settingsPayload),
        });
        const data = await res.json();
        if (!res.ok) {
          statusEl.className = 'status-msg error';
          statusEl.textContent = data.error || 'Configuração inválida.';
          return;
        }
        document.getElementById('http-manifest-url').textContent = data.httpManifestUrl;
        document.getElementById('stremio-deep-link').textContent = data.stremioDeepLink;
        document.getElementById('open-stremio-btn').setAttribute('href', data.stremioDeepLink);
        statusEl.textContent = 'Aplicado ao vivo no Stremio — não precisa reinstalar o addon!';

        // Save live preferences in the Companion: applied on the next subtitle request in Stremio
        await fetch('/companion/settings', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify(settingsPayload),
        });
      }

      async function loadSavedSettings() {
        try {
          const res = await fetch('/companion/settings', { headers: authHeaders(false) });
          if (!res.ok) return;
          const data = await res.json();
          const s = data.settings || {};
          if (!data.configured) return;
          const setVal = (id, v) => { if (v !== undefined) document.getElementById(id).value = v; };
          setVal('primary-lang', s.primaryLanguage);
          setVal('secondary-lang', s.secondaryLanguage);
          setVal('primary-offset', s.primaryOffsetMs);
          setVal('secondary-offset', s.secondaryOffsetMs);
          setVal('order-select', s.order);
          setVal('secondary-style-select', s.secondaryStyle || 'none');
          setVal('vertical-pos-select', s.verticalPosition || 'bottom');
          document.getElementById('auto-sync-toggle').checked = s.autoSync === 'on' || s.autoSync === 'true';
          selectedPrimaryColor = s.primaryColor || 'none';
          selectedSecondaryColor = s.secondaryColor || 'none';
          for (const [gid, color] of [['primary-color-swatches', selectedPrimaryColor], ['secondary-color-swatches', selectedSecondaryColor]]) {
            document.querySelectorAll('#' + gid + ' .swatch').forEach((b) => {
              b.classList.toggle('active', (b.getAttribute('data-color') || 'none') === color);
            });
          }
        } catch {}
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
          statusEl.textContent = data.error || 'Falha ao atualizar persistência.';
          e.target.checked = !enabled;
          return;
        }
        statusEl.textContent = enabled ? 'Persistência em disco ativada.' : 'Modo somente memória ativado.';
        await refreshStorage();
      });

      document.getElementById('clear-library-btn').addEventListener('click', async () => {
        if (!window.confirm('Apagar TODAS as legendas locais da memória e do disco?')) return;
        const statusEl = document.getElementById('storage-status');
        const res = await fetch('/companion/subtitles', {
          method: 'DELETE',
          headers: authHeaders(true),
        });
        if (res.ok) {
          statusEl.className = 'status-msg';
          statusEl.textContent = 'Biblioteca local limpa.';
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
          document.getElementById('install-status').textContent = 'Link copiado! Cole em Addons -> + Add Addon no Stremio.';
        } catch {
          document.getElementById('install-status').textContent = 'Copie manualmente o link na caixa acima.';
        }
      });

      (async () => {
        await loadSavedSettings();
        updateLiveCinemaPreview();
        generateInstallUrls();
      })();
      checkHealth();
      checkManifestReady();
      refreshOpenSubtitles();
      refreshStorage();
      refreshList();
    })();
  </script>
</body>
</html>`;
}
