<script setup lang="ts">
import { computed } from 'vue';
import { DOC_LINKS, SUPPORT_CHANNELS, type SupportChannel } from '../data/siteContent';

const props = withDefaults(
  defineProps<{
    channels?: SupportChannel[];
  }>(),
  {
    channels: undefined,
  },
);

const activeChannels = computed(() => props.channels ?? SUPPORT_CHANNELS);
</script>

<template>
  <section id="apoie" class="section" aria-labelledby="apoie-heading">
    <div class="container">
      <div class="support-box">
        <div class="support-copy">
          <span class="section-kicker">Apoie o projeto</span>
          <h2 id="apoie-heading" class="section-title">
            100% gratuito hoje e sempre. Apoie apenas se fizer sentido para você.
          </h2>
          <p class="section-lead">
            O SubtitleMe é mantido de forma independente, sem planos pagos, sem anúncios e sem
            recursos bloqueados. Contribuições voluntárias ajudam a cobrir tempo de manutenção e
            validação em novas plataformas — sempre em plataformas externas oficiais.
          </p>

          <ul class="support-guarantees">
            <li>Doação totalmente opcional — nenhum recurso é bloqueado para quem não doar.</li>
            <li>Zero funcionalidades exclusivas, tiers pagos ou vantagens para apoiadores.</li>
            <li>Nenhum pagamento próprio ou dado financeiro é processado pelo SubtitleMe.</li>
          </ul>
        </div>

        <div class="support-cards">
          <article v-for="channel in activeChannels" :key="channel.id" class="card support-card">
            <div class="support-card-top">
              <h3>{{ channel.name }}</h3>
              <span
                class="badge"
                :class="channel.url ? 'badge--valid' : 'badge--partial'"
              >
                {{ channel.statusLabel }}
              </span>
            </div>
            <p>{{ channel.description }}</p>
            <a
              v-if="channel.url"
              :href="channel.url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${channel.ctaLabel} (abre em nova aba)`"
              class="btn btn--primary"
            >
              {{ channel.ctaLabel }} &nearr;
            </a>
            <div v-else class="support-pending">
              <span class="support-pending-note" role="status">
                Link oficial ainda não ativado pelo mantenedor.
              </span>
              <a
                :href="DOC_LINKS.supportPolicy"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn--secondary btn--sm"
              >
                Política e FAQ de Apoio
              </a>
            </div>
          </article>
        </div>

        <p class="support-footnote">
          Prefere apoiar sem custo financeiro? Deixe uma estrela no
          <a :href="DOC_LINKS.repo" target="_blank" rel="noopener noreferrer">repositório GitHub</a>
          ou contribua reportando melhorias em
          <a :href="DOC_LINKS.issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a>.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.support-box {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 36px;
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
}

.support-copy {
  max-width: 720px;
}

.support-guarantees {
  margin: 20px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 0.94rem;
}

.support-guarantees li::marker {
  color: var(--color-accent-mint);
}

.support-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.support-card {
  background-color: var(--color-bg-elevated);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
}

.support-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.support-card h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text-primary);
}

.support-card p {
  margin: 0;
  font-size: 0.92rem;
  color: var(--color-text-secondary);
}

.support-pending {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.support-pending-note {
  font-size: 0.84rem;
  color: var(--color-text-muted);
}

.support-footnote {
  margin: 0;
  font-size: 0.88rem;
  color: var(--color-text-muted);
}

@media (max-width: 720px) {
  .support-box {
    padding: 24px 18px;
  }

  .support-cards {
    grid-template-columns: 1fr;
  }
}
</style>
