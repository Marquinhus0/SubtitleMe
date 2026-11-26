<script setup lang="ts">
import { DOC_LINKS, RELEASE_INFO } from '../data/siteContent';

const baseUrl = import.meta.env.BASE_URL;
</script>

<template>
  <footer id="documentacao" class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a href="#topo" class="brand">
          <img :src="`${baseUrl}icon-mark.svg`" alt="" width="32" height="32" class="brand-icon">
          <span class="brand-wordmark">Subtitle<span class="brand-accent">Me</span></span>
        </a>
        <p class="footer-tagline">Two languages. One experience.</p>
        <p class="footer-meta">
          Stremio Addon {{ RELEASE_INFO.tag }} · Software local-first sem telemetria e sem contas.
        </p>
      </div>

      <nav class="footer-col" aria-label="Documentação">
        <h3 class="footer-heading">Documentação</h3>
        <ul>
          <li>
            <a :href="DOC_LINKS.installation" target="_blank" rel="noopener noreferrer">
              Guia de Instalação
            </a>
          </li>
          <li>
            <a :href="DOC_LINKS.userGuide" target="_blank" rel="noopener noreferrer">
              Guia de Utilização
            </a>
          </li>
          <li>
            <a :href="DOC_LINKS.privacy" target="_blank" rel="noopener noreferrer">
              Privacidade e Segurança
            </a>
          </li>
          <li>
            <a :href="DOC_LINKS.faq" target="_blank" rel="noopener noreferrer">
              Perguntas Frequentes (FAQ)
            </a>
          </li>
        </ul>
      </nav>

      <nav class="footer-col" aria-label="Projeto e GitHub">
        <h3 class="footer-heading">Projeto e Suporte</h3>
        <ul>
          <li>
            <a :href="DOC_LINKS.repo" target="_blank" rel="noopener noreferrer">
              Repositório no GitHub
            </a>
          </li>
          <li>
            <a :href="DOC_LINKS.license" target="_blank" rel="noopener noreferrer">
              Licença MIT
            </a>
          </li>
          <li>
            <a :href="DOC_LINKS.brandIdentity" target="_blank" rel="noopener noreferrer">
              Identidade Visual
            </a>
          </li>
          <li>
            <a :href="DOC_LINKS.supportPolicy" target="_blank" rel="noopener noreferrer">
              Política de Apoio Voluntário
            </a>
          </li>
          <li>
            <a :href="DOC_LINKS.issues" target="_blank" rel="noopener noreferrer">
              Contato e Suporte (GitHub Issues)
            </a>
          </li>
        </ul>
      </nav>
    </div>

    <div class="container footer-bottom">
      <p>
        SubtitleMe · Nenhum cookie, analytics ou rastreador é utilizado nesta página.
      </p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-surface);
  padding: 56px 0 32px;
}

.footer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(0, 1fr));
  gap: 36px;
  padding-bottom: 36px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-primary);
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 10px;
}

.brand-icon {
  border-radius: 8px;
}

.brand-accent {
  color: var(--color-accent-mint);
}

.footer-tagline {
  margin: 0 0 8px;
  font-weight: 600;
  color: var(--color-accent-mint);
  font-size: 0.92rem;
}

.footer-meta {
  margin: 0;
  font-size: 0.88rem;
  color: var(--color-text-muted);
  max-width: 340px;
}

.footer-heading {
  margin: 0 0 12px;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.footer-col ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.footer-col a {
  font-size: 0.92rem;
  color: var(--color-text-secondary);
}

.footer-col a:hover {
  color: var(--color-accent-mint);
}

.footer-bottom {
  padding-top: 22px;
}

.footer-bottom p {
  margin: 0;
  font-size: 0.84rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
</style>
