<script setup lang="ts">
import { DOC_LINKS, RELEASE_INFO } from '../data/siteContent';

const baseUrl = import.meta.env.BASE_URL;
</script>

<template>
  <section id="topo" class="section section--hero">
    <div class="container hero-layout">
      <div class="hero-copy">
        <p class="hero-tagline">Two languages. One experience.</p>
        <h1 class="hero-title">Legendas bilíngues simultâneas no Stremio Desktop.</h1>
        <p class="hero-subtitle">
          Acompanhe filmes e séries com dois idiomas ao mesmo tempo para treinar escuta, vocabulário
          e compreensão — rodando 100% localmente em <code class="mono">127.0.0.1</code>, sem contas,
          sem assinaturas e sem telemetria.
        </p>

        <div class="hero-actions">
          <a href="#instalacao" class="btn btn--primary">Instalar v{{ RELEASE_INFO.version }}</a>
          <a href="#demonstracao" class="btn btn--secondary">Testar demonstração</a>
          <a
            :href="DOC_LINKS.repo"
            target="_blank"
            rel="noopener noreferrer"
            class="hero-text-link"
          >
            Código no GitHub &rarr;
          </a>
        </div>

        <dl class="hero-facts" aria-label="Especificações principais">
          <div class="fact-item">
            <dt>Idiomas</dt>
            <dd>37 idiomas</dd>
          </div>
          <div class="fact-item">
            <dt>Execução</dt>
            <dd>100% local (127.0.0.1)</dd>
          </div>
          <div class="fact-item">
            <dt>Release GA</dt>
            <dd>v{{ RELEASE_INFO.version }} · Windows 11</dd>
          </div>
        </dl>
      </div>

      <figure class="hero-visual">
        <img
          :src="`${baseUrl}images/dual-subtitle-showcase.jpg`"
          alt="Prévia do player exibindo legenda principal em inglês branco e legenda secundária em português verde-menta simultaneamente"
          width="1280"
          height="720"
          class="hero-image"
        >
        <figcaption class="hero-caption">
          Duas faixas sincronizadas em uma única legenda para o Stremio Desktop — combinando
          idiomas com alta legibilidade.
        </figcaption>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 48px;
  align-items: center;
}

.hero-tagline {
  margin: 0 0 14px;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-accent-mint);
}

.hero-title {
  margin: 0 0 20px;
  font-size: clamp(2.15rem, 4.4vw, 3.4rem);
  line-height: 1.09;
  letter-spacing: -0.032em;
  color: var(--color-text-primary);
}

.hero-subtitle {
  margin: 0 0 28px;
  font-size: 1.075rem;
  color: var(--color-text-secondary);
  max-width: 560px;
}

.hero-subtitle code {
  color: var(--color-accent-mint-soft);
  font-size: 0.94em;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-bottom: 34px;
}

.hero-text-link {
  font-size: 0.94rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 6px 4px;
}

.hero-text-link:hover {
  color: var(--color-accent-mint);
}

.hero-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin: 0;
  padding-top: 22px;
  border-top: 1px solid var(--color-border-subtle);
}

.fact-item dt {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.fact-item dd {
  margin: 0;
  font-size: 0.94rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.hero-visual {
  margin: 0;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.hero-image {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.hero-caption {
  padding: 14px 18px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border-subtle);
}

@media (max-width: 960px) {
  .hero-layout {
    grid-template-columns: 1fr;
    gap: 36px;
  }
}

@media (max-width: 560px) {
  .hero-facts {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
