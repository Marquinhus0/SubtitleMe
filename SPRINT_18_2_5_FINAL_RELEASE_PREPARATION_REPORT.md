# SubtitleMe — Relatório Final da Sprint 18.2.5
## Final Release Preparation

> **Data:** 2026-11-26  
> **Release Alvo:** SubtitleMe Stremio Addon `v1.0.0` GA + Landing Page (`apps/landing-page/`)  
> **Chrome Extension:** `v1.0.0 RC` (mantida separada, não promovida a GA)  
> **Parecer Final:** **GO (Pronto para publicação pública mediante autorização explícita do mantenedor)**

---

## 1. Arquivos Criados e Alterados na Sprint 18.2.5

| Arquivo | Ação | Finalidade |
| :--- | :--- | :--- |
| [`LICENSE`](LICENSE) | Criado | Licença MIT oficial na raiz (`Copyright (c) 2026 Marquinhus0 (SubtitleMe)`), cobrindo exclusivamente código e assets próprios |
| [`docs/SECURITY_ADVISORIES_V1_0_0.md`](docs/SECURITY_ADVISORIES_V1_0_0.md) | Criado | Registro transparente das 5 vulnerabilidades transitivas do `stremio-addon-sdk@1.6.10` (`3x path-to-regexp`, `2x tmp`), mitigações na `v1.0.0` e plano de remediação para `v1.0.1` |
| [`docs/LICENSE_AND_IP_AUDIT.md`](docs/LICENSE_AND_IP_AUDIT.md) | Atualizado | Registro da confirmação de titularidade pelo mantenedor, escopo da MIT e preservação integral das licenças/avisos de terceiros |
| [`README.md`](README.md) | Atualizado | Correção da divergência de validação Linux (`v1.0.0` CLI validado; Desktop Linux não validado visualmente), explicitação `Chrome Extension v1.0.0 RC`, seção `Licença MIT` e link para `SECURITY_ADVISORIES_V1_0_0.md` |
| [`apps/landing-page/src/data/siteContent.ts`](apps/landing-page/src/data/siteContent.ts) | Atualizado | Link `DOC_LINKS.license` apontando diretamente para `.../blob/main/LICENSE` |
| [`apps/landing-page/src/components/SiteFooter.vue`](apps/landing-page/src/components/SiteFooter.vue) | Atualizado | Rótulo do rodapé atualizado para `Licença MIT` |
| [`docs/PUBLIC_LAUNCH_CHECKLIST.md`](docs/PUBLIC_LAUNCH_CHECKLIST.md) | Atualizado | Checklist operacional completo de lançamento (commit, push, Social Preview, SHA-256 Windows/Linux, GitHub Release `v1.0.0`, deploy GitHub Pages e verificação pós-publicação) |

---

## 2. Resultado da Auditoria MIT

- **Arquivo raiz [`LICENSE`](LICENSE):** criado com texto integral da MIT License, aprovado após confirmação formal de titularidade pelo mantenedor.
- **Escopo:** cobre exclusivamente código-fonte, documentação e assets próprios do SubtitleMe.
- **Terceiros preservados:** `0` dependências copyleft fortes no grafo (`MIT: 813`, `Apache-2.0: 77`, `ISC: 43`, `BSD-2-Clause: 29`, `BlueOak-1.0.0: 23`, `BSD-3-Clause: 13`, `MPL-2.0: 5` dev-only, `0BSD: 2`); avisos e licenças de terceiros preservados integralmente.

---

## 3. Resultado dos Testes e Verificações

| Verificação | Resultado | Evidência |
| :--- | :--- | :--- |
| TypeScript (`pnpm typecheck`) | **PASS** | 10/10 projetos do workspace |
| ESLint (`pnpm lint`) | **PASS** | `0` erros, `0` warnings |
| Build de produção (`pnpm build`) | **PASS** | `apps/landing-page/dist`, `apps/stremio-addon/dist`, `apps/chrome-extension/dist` |
| Testes unitários/integração (`pnpm test`) | **PASS** | `35/35` arquivos, `141/141` testes aprovados |
| E2E Chromium (`pnpm test:browser`) | **PASS** | `pageErrors=0` |
| Licença MIT e links internos | **PASS** | `hasMitHeader: true`, **`60/60` links internos válidos** (`0` quebrados) |
| Integridade da `v1.0.0` e restrições | **PASS** | Zero alterações em `apps/stremio-addon/`, `apps/chrome-extension/`, `packages/` e `dist/release/`; zero URLs fictícias de doação; zero commits/tags/pushes/deploys executados |

---

## 4. Pendências Remanescentes (Apenas Execução Autorizada de Publicação)

1. **Commit final e `git push origin main`** (sem alterar a tag `v1.0.0`).
2. **Upload do GitHub Social Preview** (`assets/marketing/github-social-preview.png`, `1280×640`).
3. **Verificação final do SHA-256 no Windows** (`subtitleme-stremio-v1.0.0.tar.gz`, `2.476.194` bytes, `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`) e publicação da **GitHub Release `v1.0.0`**.
4. **Deploy da landing page no GitHub Pages** (`apps/landing-page/dist`) e validação final dos links públicos.
5. *(Opcional futuro)* Ativar contas oficiais GitHub Sponsors / Ko-fi e tratar as 5 vulnerabilidades transitivas do `stremio-addon-sdk` na release `v1.0.1`.

---

## 5. Checklist Operacional

Checklist detalhado passo a passo (incluindo comandos de verificação SHA-256 para PowerShell, CMD e Linux) disponível em [`docs/PUBLIC_LAUNCH_CHECKLIST.md`](docs/PUBLIC_LAUNCH_CHECKLIST.md).

---

## 6. Parecer Final

**GO** — Todos os critérios técnicos, documentais, de licenciamento (MIT), de integridade e de segurança transparente para o lançamento público do **SubtitleMe Stremio Addon `v1.0.0` GA** estão cumpridos. Aguardando autorização explícita do mantenedor para iniciar as ações de publicação.
