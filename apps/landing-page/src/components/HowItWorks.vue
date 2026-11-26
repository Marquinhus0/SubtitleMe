<script setup lang="ts">
import { HOW_IT_WORKS_STEPS } from '../data/siteContent';
</script>

<template>
  <section id="como-funciona" class="section">
    <div class="container">
      <div class="section-header">
        <span class="section-kicker">Como funciona</span>
        <h2 class="section-title">Quatro passos locais entre você e duas legendas simultâneas.</h2>
        <p class="section-lead">
          O Stremio Desktop exibe apenas uma faixa de legenda por vez. O SubtitleMe Local Companion
          combina dois idiomas no seu próprio computador e entrega uma única faixa sincronizada ao
          player.
        </p>
      </div>

      <ol class="steps-grid">
        <li v-for="step in HOW_IT_WORKS_STEPS" :key="step.number" class="card step-card">
          <span class="step-number mono">{{ step.number }}</span>
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-desc">{{ step.description }}</p>
        </li>
      </ol>

      <div class="flow-bar" role="note" aria-label="Fluxo técnico do Local Companion">
        <span class="flow-node">Stremio Desktop</span>
        <span class="flow-arrow" aria-hidden="true">&rarr;</span>
        <span class="flow-node flow-node--accent mono">127.0.0.1:7000 Companion</span>
        <span class="flow-arrow" aria-hidden="true">&rarr;</span>
        <span class="flow-node">Parser + Auto-Sync + Merge</span>
        <span class="flow-arrow" aria-hidden="true">&rarr;</span>
        <span class="flow-node">Faixa Dual (ASS / SRT / VTT)</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.steps-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  list-style: none;
  margin: 0 0 28px;
  padding: 0;
}

.step-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-number {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-accent-mint);
}

.step-title {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.35;
  color: var(--color-text-primary);
}

.step-desc {
  margin: 0;
  font-size: 0.93rem;
  color: var(--color-text-secondary);
}

.flow-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px 20px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.flow-node {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
}

.flow-node--accent {
  color: var(--color-accent-mint);
  border-color: var(--color-accent-border);
  background-color: var(--color-accent-tint);
}

.flow-arrow {
  color: var(--color-text-muted);
  font-weight: 700;
}

@media (max-width: 960px) {
  .steps-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .steps-grid {
    grid-template-columns: 1fr;
  }
}
</style>
