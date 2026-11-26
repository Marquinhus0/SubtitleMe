# SubtitleMe — Auditoria de Licença e Propriedade Intelectual (MIT)

> **Status:** **Aprovada e aplicada.** O mantenedor confirmou formalmente a titularidade sobre o código-fonte e assets próprios, e o arquivo [`LICENSE`](../LICENSE) (MIT License) foi criado na raiz do repositório na Sprint 18.2.5.

---

## 1. Escopo da Licença MIT

A **MIT License** registrada em [`LICENSE`](../LICENSE) (baseada em [`docs/LICENSE_MIT_DRAFT.txt`](LICENSE_MIT_DRAFT.txt)) cobre exclusivamente o **código-fonte original, documentação e assets próprios licenciáveis do SubtitleMe**.

Todas as dependências de terceiros, avisos de copyright e respectivos textos de licença permanecem preservados em seus pacotes originais e não são relicenciados pelo SubtitleMe.

---

## 2. Auditoria Completa de Dependências e Avisos de Terceiros

Auditoria do grafo `node_modules/.pnpm` realizada na Sprint 18.2.4/18.2.5:

- **Distribuição de licenças no grafo completo:** `MIT (813)`, `Apache-2.0 (77)`, `ISC (43)`, `BSD-2-Clause (29)`, `BlueOak-1.0.0 (23)`, `BSD-3-Clause (13)`, `MPL-2.0 (5)`, `0BSD (2)`.
- **Dependências copyleft fortes (`GPL`, `AGPL`, `LGPL`, `EUPL`, `CDDL`):** **0** (`copyleftMatches: []`).
- **Pacotes `MPL-2.0` (`lightningcss@1.33.0`, `lightningcss-linux-x64-gnu@1.33.0`) e `NOTICE` (`playwright-core@1.65.1`, Apache-2.0):** presentes apenas como ferramentas de build/teste (`devDependencies`), não distribuídos no runtime do Stremio Addon nem no bundle estático da landing page.

### Dependências diretas de produção

| Pacote / App | Dependência | Licença | Compatível com MIT? |
| :--- | :--- | :--- | :--- |
| `apps/stremio-addon` (`v1.0.0` GA) | `stremio-addon-sdk` (`^1.6.10`) | MIT | Sim |
| `apps/landing-page` | `vue` (`^3.5.46`) | MIT | Sim |
| `apps/chrome-extension` (`v1.0.0 RC`) | `vue` (`^3.5.46`), `pinia` (`^4.1.0`) | MIT | Sim |

---

## 3. Verificação de Autoria e Propriedade Intelectual

- [x] Histórico Git auditado (`git shortlog -sn --all`): `Marquinhus0` (`6` commits) e `Antigravity` (`2` commits sob direção do mantenedor) — zero contribuidores externos que exijam autorização adicional.
- [x] Titularidade formal sobre código e assets próprios confirmada pelo mantenedor.
- [x] Nenhuma legenda comercial de terceiros incluída no repositório (apenas fixtures sintéticas de teste).
- [x] Arquivo [`LICENSE`](../LICENSE) criado na raiz com `Copyright (c) 2026 Marquinhus0 (SubtitleMe)`.
