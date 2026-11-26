# SubtitleMe — Relatório da Sprint 18.2.3
## Donation System & Marketing Assets

> **Data:** 2026-11-26  
> **Marca aplicada:** `Dual Track Sync` (exclusivamente a identidade oficial aprovada)  
> **Status:** **APPROVED — Aguardando aprovação final do mantenedor**

---

## 1. Recomendação da Plataforma de Doação (Frente 1)

Auditoria completa em [`docs/SUPPORT_AND_DONATIONS.md`](docs/SUPPORT_AND_DONATIONS.md) sem invenção de disponibilidade regional, URLs ou condições comerciais:

- **Canal primário recomendado (comunidade open-source):** **GitHub Sponsors** (sujeito à confirmação de elegibilidade regional pelo mantenedor no portal oficial do GitHub), pela confiança institucional e integração direta no repositório `Marquinhus0/SubtitleMe`.
- **Canal complementar recomendado (usuários finais do Stremio):** **Ko-fi** (sujeito à confirmação de disponibilidade de saque PayPal/Stripe na região do mantenedor), por permitir contribuições pontuais sem exigir conta GitHub.
- **Governança estrita:** zero paywall, zero vantagens exclusivas para apoiadores, zero processamento próprio de pagamentos e zero armazenamento de dados financeiros.

---

## 2. Integração Segura de Doações na Landing Page (Frente 2)

- Criado [`apps/landing-page/src/config/supportConfig.ts`](apps/landing-page/src/config/supportConfig.ts) com validação estrita de origens HTTPS oficiais (`https://github.com/sponsors/...` e `https://ko-fi.com/...`) via variáveis de build `VITE_GITHUB_SPONSORS_URL` e `VITE_KOFI_URL`.
- Atualizado [`apps/landing-page/src/components/SupportSection.vue`](apps/landing-page/src/components/SupportSection.vue):
  - Quando configuradas no build, abre plataformas externas com segurança (`target="_blank" rel="noopener noreferrer"`) e acessibilidade (`aria-label` anunciando nova aba).
  - Quando não configuradas (estado padrão atual — **nenhuma URL inventada**), exibe estado honesto (`role="status"`, *"Link oficial ainda não ativado pelo mantenedor"*) com acesso à política e FAQ de apoio voluntário.

---

## 3. Inventário dos Materiais de Divulgação (`Dual Track Sync`) (Frente 3)

Todos os materiais foram renderizados exclusivamente com a marca oficial **Dual Track Sync** e priorizando capturas reais do produto (`v1.0.0`):

| Material | Arquivo | Dimensões | Origem / Uso |
| :--- | :--- | :--- | :--- |
| GitHub Social Preview | [`assets/marketing/github-social-preview.png`](assets/marketing/github-social-preview.png) | `1280×640` | GitHub *Settings → Social preview* + replicado em `apps/landing-page/public/images/og-preview.png` |
| Banner oficial | [`assets/marketing/official-banner.png`](assets/marketing/official-banner.png) | `1600×500` | Dual Track Sync + captura real do SubtitleMe Studio `v1.0.0` |
| Screenshot real do produto | [`assets/marketing/studio-real-screenshot.png`](assets/marketing/studio-real-screenshot.png) | `1280×800` | Captura direta do SubtitleMe Studio `v1.0.0` (`127.0.0.1`) |
| Experiência bilíngue | [`assets/marketing/bilingual-experience-showcase.png`](assets/marketing/bilingual-experience-showcase.png) | `1280×720` | Apresentação oficial de duas legendas simultâneas com marca Dual Track Sync |
| Card promocional da landing page | [`assets/marketing/landing-promo-card.png`](assets/marketing/landing-promo-card.png) | `1200×630` | Divulgação social combinando Dual Track Sync + captura real do Studio |
| Aplicações da marca | [`assets/marketing/brand-applications-sheet.png`](assets/marketing/brand-applications-sheet.png) | `1600×900` | Aplicações oficiais em fundo escuro, claro, monocromático e escala `16px–128px` |
| Screenshots da landing page | `docs/screenshots/landing-{desktop,mobile}-{hero,full}.png` | `1440×900` / `390×844` | Evidências desktop e mobile da landing page |

*(Removidos os arquivos antigos `assets/marketing/github-social-preview.jpg` e `apps/landing-page/public/images/og-preview.jpg` que continham o conceito anterior fora da marca Dual Track Sync.)*

---

## 4. Comunicação Oficial (Frente 4)

Documentação atualizada com todos os 6 textos solicitados:
- Descrição curta, descrição completa, texto de lançamento (`v1.0.0` GA — sem promover Chrome Extension RC), texto explicativo sobre privacidade e texto de apoio voluntário em [`docs/LAUNCH_ANNOUNCEMENT.md`](docs/LAUNCH_ANNOUNCEMENT.md).
- Auditoria de plataformas, guia de ativação por variáveis de ambiente, texto de apoio voluntário e **FAQ completo sobre doações** em [`docs/SUPPORT_AND_DONATIONS.md`](docs/SUPPORT_AND_DONATIONS.md).

---

## 5. Evidências de QA e Testes (Frente 5)

| Validação | Resultado | Evidência |
| :--- | :--- | :--- |
| TypeScript (`pnpm typecheck`) | **PASS** | Todos os 10 projetos do workspace |
| ESLint (`pnpm lint`) | **PASS** | `0` erros, `0` warnings |
| Build de produção (`pnpm build`) | **PASS** | `apps/landing-page/dist` gerado com `og-preview.png` (`Dual Track Sync`) |
| Testes automatizados (`pnpm test`) | **PASS** | `35/35` arquivos, `141/141` testes (incluindo validação de URLs oficiais de doação, rejeição de origens inválidas e CTAs acessíveis com `noopener noreferrer`) |
| E2E Chromium (`pnpm test:browser`) | **PASS** | `pageErrors=0` |
| Integridade de links e restrições | **PASS** | Todos os links internos válidos; `LICENSE` na raiz preservado ausente até conclusão da auditoria de IP; zero alterações em `apps/stremio-addon/`, `apps/chrome-extension/`, `packages/` e `dist/release/`; zero telemetria; zero paywall |
