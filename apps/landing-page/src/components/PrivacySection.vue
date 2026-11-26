<script setup lang="ts">
import { DOC_LINKS, PRIVACY_PILLARS } from '../data/siteContent';
</script>

<template>
  <section id="privacidade" class="section">
    <div class="container">
      <div class="section-header">
        <span class="section-kicker">Privacidade e segurança</span>
        <h2 class="section-title">Seus hábitos de visualização ficam no seu computador.</h2>
        <p class="section-lead">
          O SubtitleMe foi projetado desde o primeiro commit como software local-first: sem nuvem
          proprietária, sem analytics e com proteção rigorosa contra ataques locais.
        </p>
      </div>

      <div class="privacy-grid">
        <article v-for="pillar in PRIVACY_PILLARS" :key="pillar.title" class="card privacy-card">
          <h3 class="privacy-title">{{ pillar.title }}</h3>
          <p class="privacy-desc">{{ pillar.description }}</p>
        </article>
      </div>

      <div class="privacy-note">
        <p>
          Quer auditar os detalhes técnicos (modelo de ameaças, tokens efêmeros e política de
          provedores externos)?
        </p>
        <a
          :href="DOC_LINKS.privacy"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn--secondary btn--sm"
        >
          Ler Privacidade e Segurança &rarr;
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.privacy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.privacy-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.privacy-title {
  margin: 0;
  font-size: 1.08rem;
  color: var(--color-text-primary);
}

.privacy-desc {
  margin: 0;
  font-size: 0.94rem;
  color: var(--color-text-secondary);
}

.privacy-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
}

.privacy-note p {
  margin: 0;
  font-size: 0.94rem;
  color: var(--color-text-secondary);
}

@media (max-width: 720px) {
  .privacy-grid {
    grid-template-columns: 1fr;
  }
}
</style>
