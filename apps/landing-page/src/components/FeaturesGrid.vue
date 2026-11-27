<script setup lang="ts">
import { FEATURES, RELEASE_INFO } from '../data/siteContent';
</script>

<template>
  <section id="funcionalidades" class="section">
    <div class="container">
      <div class="section-header">
        <span class="section-kicker">Principais funcionalidades</span>
        <h2 class="section-title">Construído para imersão real em idiomas, sem distrações.</h2>
        <p class="section-lead">
          Cada recurso da versão {{ RELEASE_INFO.version }} foi projetado para entregar sincronização confiável, leitura
          confortável e controle completo no SubtitleMe Studio.
        </p>
      </div>

      <div class="features-grid">
        <article v-for="feature in FEATURES" :key="feature.title" class="card feature-card">
          <span class="feature-meta mono">{{ feature.meta }}</span>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-desc">{{ feature.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-meta {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-accent-mint);
}

.feature-title {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.35;
  color: var(--color-text-primary);
}

.feature-desc {
  margin: 0;
  font-size: 0.94rem;
  color: var(--color-text-secondary);
}

@media (max-width: 960px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
