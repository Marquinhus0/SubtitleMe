# SubtitleMe — Relatório Final da Sprint 18.2.4
## Legal, Licensing & Release Readiness Audit

> **Data da auditoria:** 2026-11-26  
> **Escopo:** Propriedade intelectual, licenciamento, documentação, doações, segurança/privacidade e prontidão de release pública  
> **Release auditada:** SubtitleMe Stremio Addon `v1.0.0` GA (commit `b546fc7a1590650246c3e5add923965275045d21`, tag `v1.0.0`) · Landing Page (`apps/landing-page/`)  
> **Parecer Final:** **GO CONDICIONAL (Aprovado tecnicamente; aguardando 4 pendências operacionais/jurídicas do mantenedor antes da publicação pública)**

---

## 1. Aprovado

- **Autoria do repositório (Frente 1):** Histórico Git (`git shortlog -sn --all`) apresenta exclusivamente `Marquinhus0` (`6` commits) e `Antigravity` (`2` commits — ferramenta assistiva sob direção do mantenedor). Nenhum contribuidor terceiro externo que exija cessão ou autorização adicional foi identificado.
- **Compatibilidade de licenças de dependências (Frente 1):** Auditoria completa do grafo `node_modules/.pnpm` identificou **0 dependências copyleft fortes** (`GPL`, `AGPL`, `LGPL`, `EUPL`, `CDDL`). As duas ocorrências `MPL-2.0` (`lightningcss@1.33.0`, `lightningcss-linux-x64-gnu@1.33.0`) e o único arquivo `NOTICE` (`playwright-core@1.65.1`, Apache-2.0) são estritamente ferramentas de build/teste (`devDependencies`), não distribuídas no runtime do Stremio Addon nem no bundle estático da landing page.
- **Governança de licença (Frente 1):** `LICENSE` não foi criado na raiz sem aprovação formal do titular; rascunho pronto em [`docs/LICENSE_MIT_DRAFT.txt`](docs/LICENSE_MIT_DRAFT.txt).
- **Integridade de links internos da documentação (Frente 2):** Todos os 8 documentos auditados (`README.md`, `docs/USER_GUIDE.md`, `docs/PRIVACY_AND_SECURITY.md`, `docs/FAQ.md`, `docs/INSTALLATION.md`, `docs/SUPPORT_AND_DONATIONS.md`, `docs/LAUNCH_ANNOUNCEMENT.md`, `docs/BRAND_IDENTITY.md`) existem e totalizam **`48/48` links internos válidos** (`0` quebrados).
- **Separação entre Stremio GA e Chrome RC (Frentes 2 e 5):** Nenhum material público ou seção da landing page promove a Extensão Chrome (`v1.0.0 RC`) como versão estável ou publicada na Chrome Web Store.
- **Auditoria do sistema de doações (Frente 3):** `VITE_GITHUB_SPONSORS_URL` e `VITE_KOFI_URL` não estão definidas no ambiente padrão (`url: null`), nenhuma URL foi inventada, a validação em [`apps/landing-page/src/config/supportConfig.ts`](apps/landing-page/src/config/supportConfig.ts) impõe allowlist HTTPS estrita (`https://github.com/sponsors/` e `https://ko-fi.com/`), os CTAs ativos usam `target="_blank" rel="noopener noreferrer"` + `aria-label`, e o estado não configurado usa `role="status"` acessível.
- **Segurança documental, segredos, PII e telemetria (Frente 4):**
  - `0` segredos/tokens (PAT, AWS, chaves privadas, segredos de API) detectados no repositório.
  - `0` caminhos pessoais/PII (`C:\Users\...`, `/Users/...`) detectados nos arquivos do projeto.
  - `0` rastreadores ou scripts de telemetria nos artefatos compilados (`apps/landing-page/dist/index.html` e `apps/stremio-addon/dist/index.mjs`).
  - Declarações de privacidade consistentes entre código (`127.0.0.1` loopback, sem contas, sem scraping, persistência opt-in), documentação e landing page.
- **Qualidade técnica e estabilidade (Frente 5):**
  - `apps/stremio-addon` em versão `1.0.0`, tag `v1.0.0` confirmada no remoto `origin` (`f2dc2aa57ff3f1ee6df49ac04bfe62f94abb9f3f`).
  - `assets/marketing/github-social-preview.png` (`1280×640`) e `apps/landing-page/public/images/og-preview.png` alinhados exclusivamente à marca aprovada `Dual Track Sync`.
  - Suíte completa verificada anteriormente nesta base sem regressões: `typecheck` (10/10), `lint` (0 erros/warnings), `build`, `vitest` (`35/35` arquivos, `141/141` testes) e Chromium E2E (`pageErrors=0`).
  - Zero modificações em `apps/stremio-addon/`, `apps/chrome-extension/`, `packages/` e `dist/release/`.

---

## 2. Reprovado

- **Nenhum bloqueador crítico (Reprovação = 0).**
- **Atenções técnicas registradas (não bloqueantes para `v1.0.0` local-only, mas documentadas com transparência):**
  1. **Vulnerabilidades transitivas em `stremio-addon-sdk@1.6.10` (`pnpm audit --prod`):** `5` advisories transitivos (`4 high`, `1 low`) — 3x `path-to-regexp` ReDoS (`GHSA-9wv6-86v2-598j`, `GHSA-rhx6-c78j-4q9w`, `GHSA-37ch-88jc-xwx2`) e 2x `tmp` via `inquirer > external-editor > tmp` (`GHSA-ph9p-34f9-6g65`, `GHSA-52f5-9888-hmc6`).
     - *Avaliação de risco na `v1.0.0`:* **Mitigado operacionalmente** porque o Companion aceita conexões exclusivamente em `127.0.0.1` (sem exposição à LAN/internet) e `inquirer`/`external-editor` não é invocado em runtime. Não alterar a `v1.0.0` congelada; endereçar em `v1.0.1` via atualização do SDK ou `pnpm.overrides`.
  2. **Pequena divergência documental em `README.md` (linha 108):** afirma *"Linux foi validado nativamente até 1.0.0-rc.1 (não reexecutado na v1.0.0)"*, enquanto na Sprint 17.3 a execução CLI limpa da `v1.0.0` em Linux foi validada (com player Stremio Desktop Linux ainda não validado visualmente), como já consta na landing page e em `docs/LAUNCH_ANNOUNCEMENT.md`. Recomenda-se alinhar essa linha antes do commit final de lançamento.

---

## 3. Pendente (Ações Exclusivas do Mantenedor Antes do Go-Live)

1. **Formalização da Licença MIT (Jurídico / IP):** O mantenedor deve confirmar titularidade plena de todo código e assets criados (incluindo itens gerados sob sua direção) e promover [`docs/LICENSE_MIT_DRAFT.txt`](docs/LICENSE_MIT_DRAFT.txt) para `LICENSE` na raiz do repositório.
2. **Upload e conferência local do tarball oficial `v1.0.0`:** O arquivo `subtitleme-stremio-v1.0.0.tar.gz` (`2.476.194` bytes, SHA-256 `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`) não está armazenado na VM Linux (onde `dist/release/` mantém apenas os RCs e o zip RC da extensão Chrome); ele reside no host Windows onde foi gerado e validado. O mantenedor deve reconferir seu SHA-256 no momento do upload para a GitHub Release `v1.0.0`.
3. **Ativação opcional das contas de doação:** Confirmar elegibilidade regional de **GitHub Sponsors** (primário) e **Ko-fi** (complementar) nos respectivos portais e fornecer as URLs oficiais via `VITE_GITHUB_SPONSORS_URL` / `VITE_KOFI_URL` no build de publicação (ou manter o estado seguro "aguardando ativação" caso prefira lançar sem doações inicialmente).
4. **Publicação autorizada:** Commit/push da documentação e da landing page (`Sprints 17.2–18.2.4`), upload de `assets/marketing/github-social-preview.png` no GitHub, criação da GitHub Release `v1.0.0` e deploy do GitHub Pages.

---

## 4. Recomendação

1. **Adoção da Licença MIT:** **Recomendada e tecnicamente compatível** com 100% do grafo de dependências de runtime (`stremio-addon-sdk`, `vue`, `vite`, etc.), condicionada apenas à confirmação formal de titularidade pelo mantenedor antes de criar `LICENSE` na raiz.
2. **Publicação da `v1.0.0`:** **GO CONDICIONAL** — assim que o mantenedor concluir os 4 itens da seção *Pendente* (alinhamento da nota de Linux no `README.md`, confirmação do `LICENSE`, reconferência do tarball no Windows e decisão sobre URLs de doação), o produto está pronto para publicação pública via GitHub Releases + GitHub Pages.
3. **Manutenção pós-lançamento (`v1.0.1`):** Planejar mitigação definitiva das 5 dependências transitivas do `stremio-addon-sdk` (`path-to-regexp` e `tmp`) e validação visual em Linux Desktop e macOS.

---

## 5. Evidências Coletadas

| Auditoria | Comando / Verificação | Resultado Real |
| :--- | :--- | :--- |
| Autoria Git | `git shortlog -sn --all` | `6 Marquinhus0`, `2 Antigravity` (0 terceiros externos) |
| Tag remota | `git ls-remote --tags origin v1.0.0` | `f2dc2aa57ff3f1ee6df49ac04bfe62f94abb9f3f refs/tags/v1.0.0` |
| Commit HEAD | `git rev-parse HEAD` | `b546fc7a1590650246c3e5add923965275045d21` |
| Root `LICENSE` | `ls -la LICENSE` | Ausente (preservado até validação formal de IP) |
| Licenças `node_modules/.pnpm` | Scan automatizado de `package.json` | `MIT: 813`, `Apache-2.0: 77`, `ISC: 43`, `BSD-2-Clause: 29`, `BlueOak-1.0.0: 23`, `BSD-3-Clause: 13`, `MPL-2.0: 5` (dev), `0BSD: 2`; `copyleftMatches: []` |
| Vulnerabilidades prod | `pnpm audit --prod --json` | `5` transitivas via `stremio-addon-sdk` (`3x path-to-regexp` high, `2x tmp` high/low) |
| Documentação (8 arquivos) | Verificador de links internos | `48/48` links internos válidos, `0` quebrados |
| Segredos / PII | Regex scan em arquivos fonte e docs | `0` achados (`secretAndPiiFindings: []`) |
| Telemetria nos bundles | Scan em `apps/landing-page/dist` e `apps/stremio-addon/dist` | `0` rastreadores (`landingTelemetry: []`, `stremioTelemetry: []`) |
| Testes e E2E | `pnpm test` + `pnpm test:browser` | `35/35` arquivos, `141/141` testes + Chromium E2E `pageErrors=0` |
