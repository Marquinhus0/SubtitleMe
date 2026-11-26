<script setup lang="ts">
import { ref } from 'vue';
import { DOC_LINKS, FAQ_ITEMS } from '../data/siteContent';

const openIndex = ref<number | null>(0);

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index;
}
</script>

<template>
  <section id="faq" class="section">
    <div class="container">
      <div class="section-header">
        <span class="section-kicker">Perguntas frequentes</span>
        <h2 class="section-title">Dúvidas comuns antes e depois da instalação.</h2>
        <p class="section-lead">
          Respostas diretas sobre sincronização, estilos ASS/SRT, privacidade e compatibilidade de
          plataformas.
        </p>
      </div>

      <div class="faq-list">
        <div v-for="(item, index) in FAQ_ITEMS" :key="item.question" class="faq-item">
          <h3 class="faq-heading">
            <button
              type="button"
              class="faq-trigger"
              :aria-expanded="openIndex === index"
              :aria-controls="`faq-panel-${index}`"
              @click="toggle(index)"
            >
              <span>{{ item.question }}</span>
              <span class="faq-icon mono" aria-hidden="true">
                {{ openIndex === index ? '−' : '+' }}
              </span>
            </button>
          </h3>
          <div
            v-show="openIndex === index"
            :id="`faq-panel-${index}`"
            class="faq-panel"
            role="region"
          >
            <p>{{ item.answer }}</p>
          </div>
        </div>
      </div>

      <p class="faq-footer">
        Precisa de mais detalhes? Consulte o
        <a :href="DOC_LINKS.faq" target="_blank" rel="noopener noreferrer">FAQ completo no GitHub</a>
        ou abra uma
        <a :href="DOC_LINKS.issues" target="_blank" rel="noopener noreferrer">issue técnica</a>.
      </p>
    </div>
  </section>
</template>

<style scoped>
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 820px;
}

.faq-item {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.faq-heading {
  margin: 0;
}

.faq-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 600;
  text-align: left;
}

.faq-trigger:hover {
  background-color: var(--color-bg-elevated);
}

.faq-icon {
  font-size: 1.2rem;
  color: var(--color-accent-mint);
  flex-shrink: 0;
}

.faq-panel {
  padding: 0 22px 18px;
}

.faq-panel p {
  margin: 0;
  font-size: 0.94rem;
  color: var(--color-text-secondary);
}

.faq-footer {
  margin: 24px 0 0;
  font-size: 0.92rem;
  color: var(--color-text-muted);
}
</style>
