<script setup lang="ts">
import { ref } from 'vue';
import { DOC_LINKS } from '../data/siteContent';

const mobileMenuOpen = ref(false);

const navLinks = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#demonstracao', label: 'Demonstração' },
  { href: '#privacidade', label: 'Privacidade' },
  { href: '#instalacao', label: 'Instalação' },
  { href: '#faq', label: 'FAQ' },
  { href: '#apoie', label: 'Apoie' },
];

const baseUrl = import.meta.env.BASE_URL;

function closeMenu() {
  mobileMenuOpen.value = false;
}
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <a href="#topo" class="brand" aria-label="SubtitleMe — início">
        <img :src="`${baseUrl}icon-mark.svg`" alt="" width="34" height="34" class="brand-icon">
        <span class="brand-wordmark">Subtitle<span class="brand-accent">Me</span></span>
      </a>

      <nav class="nav-desktop" aria-label="Navegação principal">
        <a v-for="item in navLinks" :key="item.href" :href="item.href" class="nav-link">
          {{ item.label }}
        </a>
      </nav>

      <div class="header-actions">
        <a
          :href="DOC_LINKS.repo"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn--secondary btn--sm"
        >
          GitHub
        </a>
        <button
          type="button"
          class="menu-toggle"
          :aria-expanded="mobileMenuOpen"
          aria-controls="mobile-nav"
          aria-label="Alternar menu de navegação"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          {{ mobileMenuOpen ? 'Fechar' : 'Menu' }}
        </button>
      </div>
    </div>

    <nav v-if="mobileMenuOpen" id="mobile-nav" class="nav-mobile" aria-label="Navegação móvel">
      <div class="container nav-mobile-inner">
        <a
          v-for="item in navLinks"
          :key="item.href"
          :href="item.href"
          class="nav-mobile-link"
          @click="closeMenu"
        >
          {{ item.label }}
        </a>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: rgba(7, 9, 13, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border-subtle);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 68px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-primary);
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
}

.brand-icon {
  border-radius: 8px;
}

.brand-accent {
  color: var(--color-accent-mint);
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 22px;
}

.nav-link {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.nav-link:hover {
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.menu-toggle {
  display: none;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 7px 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.nav-mobile {
  border-top: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-surface);
}

.nav-mobile-inner {
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  padding-bottom: 16px;
}

.nav-mobile-link {
  padding: 10px 0;
  color: var(--color-text-secondary);
  font-weight: 500;
  border-bottom: 1px solid rgba(30, 38, 51, 0.6);
}

.nav-mobile-link:last-child {
  border-bottom: none;
}

@media (max-width: 960px) {
  .nav-desktop {
    display: none;
  }

  .menu-toggle {
    display: inline-flex;
  }
}
</style>
