<script setup lang="ts">
import { computed, ref } from 'vue';
import { DEMO_LANGUAGE_PAIRS, DEMO_SCENES } from '../data/siteContent';

const baseUrl = import.meta.env.BASE_URL;
const selectedPairId = ref<string>('en-pt');
const selectedFormat = ref<'ass' | 'srt'>('ass');
const revealModeEnabled = ref<boolean>(false);
const translationRevealed = ref<boolean>(false);
const sceneIndex = ref<number>(0);

const currentPair = computed(
  () => DEMO_LANGUAGE_PAIRS.find((p) => p.id === selectedPairId.value) ?? DEMO_LANGUAGE_PAIRS[0],
);

const currentScene = computed(() => DEMO_SCENES[sceneIndex.value] ?? DEMO_SCENES[0]);

const activeLines = computed(() => {
  const pairLines = currentScene.value.pairs[selectedPairId.value];
  return pairLines ?? currentScene.value.pairs['en-pt'];
});

const showSecondaryText = computed(() => !revealModeEnabled.value || translationRevealed.value);

function selectScene(index: number) {
  sceneIndex.value = index;
  translationRevealed.value = false;
}

function toggleRevealMode() {
  revealModeEnabled.value = !revealModeEnabled.value;
  translationRevealed.value = false;
}
</script>

<template>
  <section id="demonstracao" class="section">
    <div class="container">
      <div class="section-header">
        <span class="section-kicker">Demonstração visual</span>
        <h2 class="section-title">Experimente o comportamento bilíngue e o Modo Reveal.</h2>
        <p class="section-lead">
          Alterne pares de idiomas, compare o formato ASS estilizado com o modo Branco SRT e teste o
          Modo Reveal — note como a linha principal nunca salta quando a tradução aparece.
        </p>
      </div>

      <div class="demo-shell">
        <div class="demo-controls" role="region" aria-label="Controles da demonstração de legendas">
          <div class="control-group">
            <span class="control-label">Par de idiomas</span>
            <div class="pill-row">
              <button
                v-for="pair in DEMO_LANGUAGE_PAIRS"
                :key="pair.id"
                type="button"
                class="pill-btn"
                :class="{ 'pill-btn--active': selectedPairId === pair.id }"
                :aria-pressed="selectedPairId === pair.id"
                @click="selectedPairId = pair.id"
              >
                {{ pair.label }}
              </button>
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">Formato de saída</span>
            <div class="pill-row">
              <button
                type="button"
                class="pill-btn"
                :class="{ 'pill-btn--active': selectedFormat === 'ass' }"
                :aria-pressed="selectedFormat === 'ass'"
                @click="selectedFormat = 'ass'"
              >
                ASS Estilizado
              </button>
              <button
                type="button"
                class="pill-btn"
                :class="{ 'pill-btn--active': selectedFormat === 'srt' }"
                :aria-pressed="selectedFormat === 'srt'"
                @click="selectedFormat = 'srt'"
              >
                Branco SRT
              </button>
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">Escuta ativa</span>
            <div class="pill-row">
              <button
                type="button"
                class="pill-btn"
                :class="{ 'pill-btn--active': revealModeEnabled }"
                :aria-pressed="revealModeEnabled"
                @click="toggleRevealMode"
              >
                Modo Reveal: {{ revealModeEnabled ? 'Ativo' : 'Desligado' }}
              </button>
              <button
                v-if="revealModeEnabled"
                type="button"
                class="btn btn--primary btn--sm"
                @click="translationRevealed = !translationRevealed"
              >
                {{ translationRevealed ? 'Ocultar tradução' : 'Revelar tradução' }}
              </button>
            </div>
          </div>
        </div>

        <div class="cinema-stage">
          <img
            :src="`${baseUrl}images/cinema-demo-still.jpg`"
            alt="Cena cinematográfica em plataforma de trem sob chuva ao entardecer"
            width="1280"
            height="720"
            class="cinema-backdrop"
          >
          <div class="cinema-vignette" aria-hidden="true" />

          <div class="cinema-hud">
            <span class="hud-track mono">
              Dual {{ currentPair.label }} 1 (Sync/OS) · 96%
            </span>
            <span class="hud-time mono">{{ currentScene.timestamp }}</span>
          </div>

          <div
            class="subtitle-overlay"
            :class="{
              'subtitle-overlay--ass': selectedFormat === 'ass',
              'subtitle-overlay--srt': selectedFormat === 'srt',
            }"
            aria-live="polite"
          >
            <p class="subtitle-primary">{{ activeLines.primary }}</p>
            <p
              class="subtitle-secondary"
              :class="{ 'subtitle-secondary--hidden': !showSecondaryText }"
            >
              {{ showSecondaryText ? activeLines.secondary : '\u00A0' }}
            </p>
          </div>
        </div>

        <div class="scene-bar">
          <span class="scene-hint">
            {{
              revealModeEnabled && !translationRevealed
                ? 'Modo Reveal ativo: altura da tradução reservada sem pulo vertical.'
                : 'Troque o diálogo para testar a transição entre falas:'
            }}
          </span>
          <div class="pill-row">
            <button
              v-for="(scene, index) in DEMO_SCENES"
              :key="scene.timestamp"
              type="button"
              class="pill-btn mono"
              :class="{ 'pill-btn--active': sceneIndex === index }"
              :aria-pressed="sceneIndex === index"
              @click="selectScene(index)"
            >
              Cena {{ index + 1 }} ({{ scene.timestamp }})
            </button>
          </div>
        </div>
      </div>

      <figure class="studio-showcase">
        <div class="studio-showcase-header">
          <div>
            <h3 class="studio-showcase-title">SubtitleMe Studio real (v1.0.0)</h3>
            <p class="studio-showcase-desc">
              Captura real do painel local em <code class="mono">http://127.0.0.1:7000/configure</code>
              com pré-visualização ao vivo, seleção de idiomas, Modo Reveal, estilo ASS/SRT e motores de sincronia.
            </p>
          </div>
          <span class="badge badge--valid">Captura real · 127.0.0.1</span>
        </div>
        <img
          :src="`${baseUrl}images/studio-real-screenshot.png`"
          alt="Captura de tela real do SubtitleMe Studio v1.0.0 rodando localmente em 127.0.0.1 com prévia bilíngue EN e PT-BR, controles de estilo ASS e motores de legenda"
          width="1280"
          height="800"
          class="studio-image"
        >
      </figure>
    </div>
  </section>
</template>

<style scoped>
.demo-shell {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 32px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-elevated);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 0.76rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill-btn {
  padding: 7px 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-size: 0.84rem;
  font-weight: 600;
  transition: border-color var(--transition-fast), color var(--transition-fast),
    background-color var(--transition-fast);
}

.pill-btn:hover {
  border-color: var(--color-accent-mint);
  color: var(--color-text-primary);
}

.pill-btn--active {
  background-color: var(--color-accent-tint);
  border-color: var(--color-accent-mint);
  color: var(--color-accent-mint);
}

.cinema-stage {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  background-color: #040608;
}

.cinema-backdrop {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cinema-vignette {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(4, 6, 10, 0.88) 0%,
    rgba(4, 6, 10, 0.25) 38%,
    rgba(4, 6, 10, 0.35) 100%
  );
  pointer-events: none;
}

.cinema-hud {
  position: absolute;
  top: 16px;
  left: 18px;
  right: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hud-track,
.hud-time {
  font-size: 0.78rem;
  padding: 5px 10px;
  border-radius: 6px;
  background-color: rgba(7, 9, 13, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--color-text-primary);
}

.hud-track {
  color: var(--color-accent-mint);
  border-color: var(--color-accent-border);
}

.subtitle-overlay {
  position: absolute;
  left: 50%;
  bottom: 7%;
  transform: translateX(-50%);
  width: min(90%, 760px);
  text-align: center;
  padding: 12px 20px;
  border-radius: 10px;
}

.subtitle-overlay--ass {
  background-color: rgba(7, 9, 13, 0.72);
  backdrop-filter: blur(4px);
}

.subtitle-overlay--srt {
  background-color: transparent;
}

.subtitle-primary,
.subtitle-secondary {
  margin: 0;
  line-height: 1.38;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
}

.subtitle-primary {
  font-size: clamp(1rem, 2.2vw, 1.55rem);
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 6px;
}

.subtitle-secondary {
  font-size: clamp(0.92rem, 1.9vw, 1.32rem);
  font-weight: 500;
  min-height: 1.38em;
  transition: opacity var(--transition-fast);
}

.subtitle-overlay--ass .subtitle-secondary {
  color: var(--color-accent-mint);
}

.subtitle-overlay--srt .subtitle-secondary {
  color: #f3f4f6;
}

.subtitle-secondary--hidden {
  opacity: 0;
}

.scene-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-subtle);
}

.scene-hint {
  font-size: 0.87rem;
  color: var(--color-text-secondary);
}

.studio-showcase {
  margin: 28px 0 0;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.studio-showcase-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-elevated);
}

.studio-showcase-title {
  margin: 0 0 6px;
  font-size: 1.05rem;
  color: var(--color-text-primary);
}

.studio-showcase-desc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  max-width: 680px;
}

.studio-showcase-desc code {
  color: var(--color-accent-mint-soft);
}

.studio-image {
  width: 100%;
  height: auto;
  display: block;
}

@media (max-width: 640px) {
  .demo-controls,
  .scene-bar,
  .studio-showcase-header {
    padding: 16px;
  }

  .cinema-hud {
    top: 10px;
    left: 10px;
    right: 10px;
  }

  .hud-track,
  .hud-time {
    font-size: 0.7rem;
  }
}
</style>
