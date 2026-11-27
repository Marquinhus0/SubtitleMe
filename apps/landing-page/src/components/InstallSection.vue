<script setup lang="ts">
import { computed, ref } from 'vue';
import { COMPATIBILITY_ROWS, DOC_LINKS, RELEASE_INFO } from '../data/siteContent';

const activeOs = ref<'windows' | 'linux'>('windows');
const copiedKey = ref<string | null>(null);

const windowsCommands = `mkdir subtitleme-stremio
tar -xzf ${RELEASE_INFO.tarball} -C subtitleme-stremio
cd subtitleme-stremio
.\\bin\\start-companion.cmd`;

const linuxCommands = `mkdir -p subtitleme-stremio
tar -xzf ${RELEASE_INFO.tarball} -C subtitleme-stremio
cd subtitleme-stremio
chmod +x ./bin/start-companion.sh && ./bin/start-companion.sh`;

const activeCommands = computed(() =>
  activeOs.value === 'windows' ? windowsCommands : linuxCommands,
);

async function copyText(key: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedKey.value = key;
    window.setTimeout(() => {
      if (copiedKey.value === key) {
        copiedKey.value = null;
      }
    }, 2000);
  } catch {
    copiedKey.value = null;
  }
}
</script>

<template>
  <section id="instalacao" class="section">
    <div class="container">
      <div class="section-header">
        <span class="section-kicker">Instalação do Stremio Addon</span>
        <h2 class="section-title">Pronto para rodar em menos de dois minutos.</h2>
        <p class="section-lead">
          Requer <strong>Node.js 22+</strong> e <strong>Stremio Desktop</strong> no mesmo
          computador. Escolha seu sistema operacional abaixo para copiar os comandos da versão
          <code class="mono">{{ RELEASE_INFO.tag }}</code>.
        </p>
      </div>

      <div class="install-layout">
        <div class="card install-card">
          <div class="os-tabs" role="tablist" aria-label="Sistema operacional">
            <button
              type="button"
              role="tab"
              class="os-tab"
              :class="{ 'os-tab--active': activeOs === 'windows' }"
              :aria-selected="activeOs === 'windows'"
              @click="activeOs = 'windows'"
            >
              Windows 11 (Validado)
            </button>
            <button
              type="button"
              role="tab"
              class="os-tab"
              :class="{ 'os-tab--active': activeOs === 'linux' }"
              :aria-selected="activeOs === 'linux'"
              @click="activeOs = 'linux'"
            >
              Linux (CLI Validado)
            </button>
          </div>

          <div class="code-header">
            <span class="code-label">1. Extraia o pacote e inicie o Local Companion</span>
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              @click="copyText('cmd', activeCommands)"
            >
              {{ copiedKey === 'cmd' ? 'Copiado' : 'Copiar comandos' }}
            </button>
          </div>
          <div class="code-block">
            <pre><code>{{ activeCommands }}</code></pre>
          </div>

          <div class="url-grid">
            <div class="url-box">
              <span class="url-label">2. Abra o SubtitleMe Studio</span>
              <div class="url-row">
                <code class="mono">{{ RELEASE_INFO.studioUrl }}</code>
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  @click="copyText('studio', RELEASE_INFO.studioUrl)"
                >
                  {{ copiedKey === 'studio' ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
            </div>

            <div class="url-box">
              <span class="url-label">3. URL do Manifest no Stremio</span>
              <div class="url-row">
                <code class="mono">{{ RELEASE_INFO.manifestUrl }}</code>
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  @click="copyText('manifest', RELEASE_INFO.manifestUrl)"
                >
                  {{ copiedKey === 'manifest' ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
            </div>
          </div>

          <div class="hash-box">
            <div class="hash-top">
              <span class="url-label">
                Integridade do pacote GA (<code class="mono">{{ RELEASE_INFO.tarball }}</code>)
              </span>
              <button
                type="button"
                class="btn btn--secondary btn--sm"
                @click="copyText('sha256', RELEASE_INFO.sha256)"
              >
                {{ copiedKey === 'sha256' ? 'Copiado' : 'Copiar SHA-256' }}
              </button>
            </div>
            <code class="hash-value mono">{{ RELEASE_INFO.sha256 }}</code>
          </div>

          <div class="install-links">
            <a
              :href="RELEASE_INFO.downloadUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn--primary"
            >
              Baixar {{ RELEASE_INFO.tag }} (.tar.gz)
            </a>
            <a
              :href="RELEASE_INFO.releaseUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn--secondary"
            >
              Release {{ RELEASE_INFO.tag }}
            </a>
            <a
              :href="RELEASE_INFO.checksumUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn--secondary"
            >
              Arquivo .sha256
            </a>
            <a
              :href="DOC_LINKS.installation"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn--secondary"
            >
              Guia Completo de Instalação
            </a>
            <a
              :href="DOC_LINKS.userGuide"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn--secondary"
            >
              Guia de Utilização
            </a>
          </div>
        </div>

        <div class="card compat-card">
          <h3 class="compat-title">Compatibilidade real (v{{ RELEASE_INFO.version }})</h3>
          <p class="compat-lead">
            Declaramos apenas o que foi efetivamente testado e validado nesta release.
          </p>
          <ul class="compat-list">
            <li v-for="row in COMPATIBILITY_ROWS" :key="row.platform" class="compat-item">
              <div class="compat-row-top">
                <strong class="compat-platform">{{ row.platform }}</strong>
                <span class="badge" :class="`badge--${row.status}`">{{ row.label }}</span>
              </div>
              <p class="compat-notes">{{ row.notes }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.install-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 24px;
  align-items: start;
}

.install-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.os-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.os-tab {
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
}

.os-tab--active {
  background-color: var(--color-accent-tint);
  border-color: var(--color-accent-mint);
  color: var(--color-accent-mint);
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.code-label,
.url-label {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.url-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.url-box,
.hash-box {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-canvas);
  border: 1px solid var(--color-border-subtle);
}

.url-row,
.hash-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
}

.url-row code {
  font-size: 0.86rem;
  color: var(--color-accent-mint-soft);
  word-break: break-all;
}

.hash-top {
  margin-top: 0;
  margin-bottom: 8px;
}

.hash-value {
  display: block;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  word-break: break-all;
}

.install-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 6px;
}

.compat-title {
  margin: 0 0 8px;
  font-size: 1.12rem;
  color: var(--color-text-primary);
}

.compat-lead {
  margin: 0 0 18px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.compat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.compat-item {
  padding-top: 14px;
  border-top: 1px solid var(--color-border-subtle);
}

.compat-item:first-child {
  padding-top: 0;
  border-top: none;
}

.compat-row-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.compat-platform {
  font-size: 0.92rem;
  color: var(--color-text-primary);
}

.compat-notes {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

@media (max-width: 960px) {
  .install-layout {
    grid-template-columns: 1fr;
  }
}
</style>
