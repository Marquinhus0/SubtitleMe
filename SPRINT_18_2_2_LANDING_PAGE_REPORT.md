# SubtitleMe — Relatório da Sprint 18.2.2
## Landing Page Design & Implementation

> **Data:** 2026-11-26  
> **Identidade aplicada:** Proposta A — Dual Track Sync · Obsidian `#070B09` · Emerald `#10B981` · Mint `#34D399` · Texto `#EEF4F1` / `#8FA399`  
> **Status:** **APPROVED — Aguardando validação visual antes de avançar para integração de doações e materiais promocionais**

---

## 1. Auditoria e Arquitetura Implementada

- **Localização no monorepo:** [`apps/landing-page/`](apps/landing-page/) — automaticamente integrado ao `pnpm-workspace.yaml` (`apps/*`) sem conflitar com `apps/stremio-addon/` (`v1.0.0` GA) nem `apps/chrome-extension/` (`v1.0.0 RC`).
- **Stack compatível com o monorepo:**
  - **Vue 3 (`^3.5.46`) + TypeScript (`~5.9.3`) + Vite (`^8.3.8`) + Tailwind CSS v4 (`^4.3.5` via `@tailwindcss/vite`)**.
  - Importação direta dos tokens oficiais em [`assets/brand/design-tokens.css`](assets/brand/design-tokens.css) (`@import "tailwindcss"; @import "../../../../assets/brand/design-tokens.css";`).
  - Compatibilidade nativa com **GitHub Pages** (`base: './'` + `import.meta.env.BASE_URL` validado em subcaminho `/SubtitleMe/`).
  - **Zero telemetria, zero analytics, zero cookies e zero requisições externas no carregamento.**

### Estrutura das 9 Seções

1. **Hero** (`HeroSection.vue`): Logo oficial Proposta A, tagline *"Two languages. One experience."*, headline direta, CTAs objetivos (`Instalar v1.0.0`, `Testar demonstração`, `Código no GitHub`) e prévia visual bilíngue.
2. **Como funciona** (`HowItWorks.vue`): 4 passos locais claros + fluxo técnico `Stremio Desktop → 127.0.0.1:7000 Companion → Parser + Auto-Sync + Merge → Faixa Dual`.
3. **Funcionalidades** (`FeaturesGrid.vue`): 6 cards com funcionalidades reais da `v1.0.0` (37 idiomas, 1–5 pares ranqueados, motor multi-fonte + importação local, Auto-Sync + anti-flicker `380ms`, Modo Reveal `0s–2s`, formatos `ASS`/`SRT`/`VTT`).
4. **Demonstração** (`InteractiveDemo.vue`):
   - Simulador interativo sobre cena cinematográfica com alternância de 4 pares de idiomas, `ASS Estilizado` vs `Branco SRT` e **Modo Reveal** sem pulo vertical.
   - **Screenshot real do produto (`v1.0.0`):** captura real do **SubtitleMe Studio** (`http://127.0.0.1:7000/configure`) em [`apps/landing-page/public/images/studio-real-screenshot.png`](apps/landing-page/public/images/studio-real-screenshot.png).
5. **Privacidade** (`PrivacySection.vue`): Local-first (`127.0.0.1`), sem telemetria, sem scraping, proteção DNS Rebinding/CSRF e transparência sobre fontes e persistência.
6. **Instalação** (`InstallSection.vue`): Comandos copiáveis em abas **Windows 11 (Validado)** e **Linux (CLI Validado)**, URLs locais, SHA-256 oficial do tarball `v1.0.0` e matriz honesta de compatibilidade (sem promover Chrome Extension RC como estável).
7. **FAQ** (`FaqSection.vue`): Acordeão acessível cobrindo instalação, cores ASS, porta `7000`, privacidade, mobile/TV, sincronia e status da extensão Chrome RC.
8. **Apoie o projeto** (`SupportSection.vue`): Estrutura preparada para **GitHub Sponsors** e **Ko-fi** com `url: null` (**nenhuma URL inventada**), 100% gratuito, zero paywall e zero vantagens exclusivas.
9. **Footer** (`SiteFooter.vue`): Links para GitHub, Documentação, Privacidade, Licença (em validação pré-MIT) e Contato/Suporte (GitHub Issues).

---

## 2. Arquivos Criados e Alterados na Sprint 18.2.2

| Arquivo | Ação | Finalidade |
| :--- | :--- | :--- |
| [`apps/landing-page/package.json`](apps/landing-page/package.json) | Atualizado | Adicionado `tailwindcss` e `@tailwindcss/vite` (`^4.3.5`) |
| [`apps/landing-page/vite.config.ts`](apps/landing-page/vite.config.ts) | Atualizado | Plugin `tailwindcss()` + `base: './'` para GitHub Pages |
| [`apps/landing-page/index.html`](apps/landing-page/index.html) | Atualizado | `theme-color: #070B09`, favicons SVG/PNG/Apple Touch da Proposta A, SEO e Open Graph |
| [`apps/landing-page/src/styles/main.css`](apps/landing-page/src/styles/main.css) | Atualizado | Tailwind CSS v4 + `@import` direto de `assets/brand/design-tokens.css` |
| [`apps/landing-page/src/data/siteContent.ts`](apps/landing-page/src/data/siteContent.ts) | Atualizado | Removidas URLs não confirmadas de doação (`SUPPORT_CHANNELS` com `url: null`) + link de auditoria de licença |
| [`apps/landing-page/src/components/InteractiveDemo.vue`](apps/landing-page/src/components/InteractiveDemo.vue) | Atualizado | Incorporada captura real do SubtitleMe Studio `v1.0.0` |
| [`apps/landing-page/src/components/InstallSection.vue`](apps/landing-page/src/components/InstallSection.vue) | Atualizado | Correção `min-width: 0` eliminando overflow horizontal em mobile (`390px`) |
| [`apps/landing-page/src/components/SupportSection.vue`](apps/landing-page/src/components/SupportSection.vue) | Atualizado | Cards preparados para GitHub Sponsors e Ko-fi sem URLs inventadas |
| [`apps/landing-page/src/components/SiteFooter.vue`](apps/landing-page/src/components/SiteFooter.vue) | Atualizado | Links explícitos para Licença (em validação) e Contato/Suporte |
| [`apps/landing-page/public/images/studio-real-screenshot.png`](apps/landing-page/public/images/studio-real-screenshot.png) | Criado | Screenshot real do SubtitleMe Studio `v1.0.0` |
| [`tests/unit/landing-page.test.ts`](tests/unit/landing-page.test.ts) | Criado | Suíte automatizada Vitest validando 9 seções, Modo Reveal, abas de instalação e ausência de URLs inventadas |
| `docs/screenshots/landing-{desktop,mobile}-{hero,full}.png` | Criados | Evidências visuais desktop (`1440×900`) e mobile (`390×844`) |

---

## 3. Evidências Visuais (Desktop e Mobile)

Capturas geradas diretamente a partir do build de produção (`apps/landing-page/dist/`) servido em subcaminho `/SubtitleMe/` (simulando GitHub Pages):

- Desktop Hero (`1440×900`): [`docs/screenshots/landing-desktop-hero.png`](docs/screenshots/landing-desktop-hero.png)
- Desktop Completo: [`docs/screenshots/landing-desktop-full.png`](docs/screenshots/landing-desktop-full.png)
- Mobile Hero (`390×844`): [`docs/screenshots/landing-mobile-hero.png`](docs/screenshots/landing-mobile-hero.png)
- Mobile Completo: [`docs/screenshots/landing-mobile-full.png`](docs/screenshots/landing-mobile-full.png)

---

## 4. Resultado dos Testes e QA

| Validação | Resultado | Evidência |
| :--- | :--- | :--- |
| Build de produção (`apps/landing-page`) | **PASS** | `dist/index.html` (`1.82 kB`), CSS (`29.55 kB` / gzip `6.32 kB`), JS (`95.89 kB` / gzip `36.01 kB`), build em `825ms` |
| TypeScript (`pnpm typecheck`) | **PASS** | Todos os 10 projetos do workspace |
| ESLint (`pnpm lint`) | **PASS** | `0` erros, `0` warnings |
| Testes unitários/integração (`pnpm test`) | **PASS** | `35/35` arquivos de teste, `139/139` testes aprovados (incluindo 4 novos testes da landing page) |
| Testes E2E Chromium (`pnpm test:browser`) | **PASS** | `pageErrors=0` |
| QA Playwright em subcaminho `/SubtitleMe/` | **PASS** | `h1Count: 1`, `5/5` imagens carregadas (`brokenImgs: []`), `bgColor: rgb(7, 11, 9)`, `desktopOverflowX: false`, `mobileOverflowX: false`, `0` erros de console/página, `0` requisições externas |
| Integridade do Stremio Addon `v1.0.0` | **PASS** | Zero arquivos modificados em `apps/stremio-addon/`, `apps/chrome-extension/`, `packages/` e `dist/release/` |

---

## 5. Pendências e Limitações

1. **Links oficiais de doação (GitHub Sponsors / Ko-fi):** mantidos como `null` (`Integração preparada`) até a próxima etapa de ativação oficial das contas pelo mantenedor — nenhuma URL foi inventada.
2. **Licença MIT na raiz:** o footer aponta para [`docs/LICENSE_AND_IP_AUDIT.md`](docs/LICENSE_AND_IP_AUDIT.md) até confirmação formal de propriedade intelectual e criação de `LICENSE`.
3. **Publicação no GitHub Pages:** build estático pronto em `apps/landing-page/dist/`, aguardando autorização para commit/push e ativação do workflow de deploy.
