# SubtitleMe Stremio Addon — GA Readiness & Final Audit Report (Sprint 16)

**Data da Auditoria:** 2026-11-26  
**Componente Auditado:** `@subtitleme/stremio-addon`  
**Release Candidate Auditado:** `1.0.0-rc.8`  
**Artefato Auditado:** `dist/release/subtitleme-stremio-v1.0.0-rc.8.tar.gz` (`2.471.190` bytes · `5.628` arquivos)  
**SHA-256 Verificado:** `c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`  
**Branch / Commit Base:** `main` @ `1c6e866dc10ee2bbb335adecb3b8351cb7eb8199`  
**Ambiente de Auditoria:** Windows 11 X64 · Node.js `v24.19.0` · npm `11.17.0` · Corepack pnpm `12.21.0` · Stremio Desktop `5.0.28`

---

## 1. Decisão Final de Release (`GO` / `CONDITIONAL GO` / `NO-GO`)

### **DECISÃO FINAL: `NO-GO` — Manter `1.0.0-rc.8` (Promoção para `1.0.0 GA` Retida por Bloqueador de Evidência Visual Formal)**

**Justificativa objetiva:**
- **Todos os gates técnicos internos, de empacotamento standalone, funcionais (camadas unitária, HTTP e subprocesso limpo), de segurança e de regressão completa foram aprovados com evidências verificáveis.**
- Entretanto, conforme as regras estritas das **Fases 3, 7 e 8** desta auditoria (*"Não aceitar screenshots de mockups ou simulações como evidência. Se os artefatos de evidência não existirem, marcar o critério como pendente e solicitar nova execução"* e *"NO-GO: existe bloqueador funcional, de segurança, distribuição ou evidência"*), **não existem artefatos visuais reais arquivados do player do Stremio Desktop `5.0.28`** comprovando formalmente os 10 subcritérios de reprodução real da `1.0.0-rc.8`.
- As capturas de tela existentes na sessão referem-se à interface web de configuração (`/configure` com prévia simulada), e o aceite anterior no Stremio Desktop `5.0.28` ocorreu por relato verbal sem gravação/capturas arquivadas em `artifacts/` ou `docs/validation/stremio-desktop/` cobrindo todos os cenários de player (`pause/resume`, `seek`, `Modo Reveal` em vídeo real, múltiplos pares no seletor real do player e estabilidade contínua).
- Portanto, **`1.0.0-rc.8` permanece preservado integralmente** e **nenhuma promoção automática para `1.0.0` foi executada**.

---

## 2. Resumo dos Gates Obrigatórios

| Gate | Fase | Escopo | Status | Camada de Evidência |
| :--- | :--- | :--- | :--- | :--- |
| **G0 — Preservação Git & RCs** | Fase 0 | `main @ 1c6e866`, histórico `rc.1..rc.8` intacto, zero push/publish | **APPROVED** | Inspeção Git + filesystem + `Get-FileHash` |
| **G1 — Integridade & Pacote Standalone** | Fase 1 | SHA-256 exato, sem `workspace:*`, sem segredos, execução isolada em `C:\` fora do monorepo | **APPROVED** *(com 3 observações não-críticas)* | Subprocesso real `cmd /c bin\start-companion.cmd` + HTTP |
| **G2 — Auditoria Funcional (16 Itens)** | Fase 2 | Discovery, matching, `1..5` pares, ranking `%`, VTT/ASS/SRT, 37 idiomas, offsets, Reveal, âncora bidirecional, anti-flicker `380ms`, persistência/cache | **APPROVED** *(camadas automatizada, HTTP e subprocesso)* | Vitest (`134` testes) + auditoria HTTP standalone |
| **G3 — Auditoria Visual Real no Stremio `5.0.28`** | Fase 3 | 10 critérios visuais reais dentro do player nativo (sem mockups/simuladores) | **PENDING (BLOCKER)** | Relato verbal de funcionamento, porém **0 screenshots/logs formais do player arquivados** |
| **G4 — Auditoria de Segurança & Privacidade** | Fase 4 | `127.0.0.1`, token 256-bit, CSRF, Host, Origin, CORS/PNA separados, `O_NOFOLLOW`/limites, `0` segredos em `277` arquivos Git | **APPROVED** | Código + suítes de segurança + varredura Git |
| **G5 — Matriz de Compatibilidade** | Fase 5 | Distinção rigorosa entre `Testado`, `Parcialmente testado`, `Não testado` e `Não suportado` | **APPROVED** | `docs/GA_COMPATIBILITY_MATRIX.md` |
| **G6 — Regressão Completa do Monorepo** | Fase 6 | `typecheck` (8 pacotes), `lint`, `build`, `vitest` (`34/34`), Chromium E2E `test:browser`, clean install | **APPROVED** | Execução real de todos os comandos no Windows 11 |

---

## 3. Problemas e Observações Encontrados na Auditoria

### 3.1. Bloqueador de Promoção (`NO-GO`)
1. **[B-01] Ausência de Artefatos Comprobatórios do Player Real (Fase 3)**:
   - Diretórios `artifacts/stremio-visual-validation/screenshots/` e `docs/validation/stremio-desktop/` não contêm capturas reais do player do Stremio Desktop `5.0.28` executando a `1.0.0-rc.8` para os 10 subcritérios exigidos (menu com múltiplos pares `Dual 1..N`, renderização dupla simultânea `.ASS` e `.SRT`, posicionamento, sincronização, `pause/resume`, `seek`, `Modo Reveal` em reprodução real e estabilidade contínua).

### 3.2. Observações Técnicas Não-Críticas (Para Correção Antes/Junto da Promoção `1.0.0`)
1. **[NC-01] Deriva de versão padrão em `User-Agent` interno da OpenSubtitles**:
   - `apps/stremio-addon/src/discovery/opensubtitles-discovery-provider.ts` (linha 102) define fallback `'SubtitleMe v1.0.0-rc.3'`.
   - `apps/stremio-addon/src/sources/opensubtitles-source.ts` (linha 94) define fallback `'SubtitleMe v0.2.0'`.
   - `package.json` e `manifest.ts` declaram corretamente `'1.0.0-rc.8'`.
2. **[NC-02] Ausência de `README.md` / `LICENSE` na raiz interna do `.tar.gz`**:
   - O tarball standalone contém `package.json`, `package-lock.json`, `dist/index.mjs`, `bin/start-companion.{cmd,ps1,sh}` e `node_modules/` (`5.628` arquivos), funcionando de forma 100% autônoma, mas `scripts/package-stremio-addon.mjs` ainda não copia um `README.md` resumido de operação para dentro do pacote extraído.
3. **[NC-03] Descoberta de binário do Chromium no Windows em `tests/e2e/chrome-extension.mjs`**:
   - O script procura por padrão caminhos Linux (`/opt/ms-playwright`, `/usr/bin/chromium`), exigindo definir a variável `CHROME_PATH` ao rodar `test:browser` nativamente no Windows 11. Com `CHROME_PATH` apontando para o Chromium do Playwright no Windows, a suíte E2E inteira passa (`pageErrors=0`).
4. **[NC-04] Armazenamento local em texto claro (`providers.json` / `settings.json`) quando `SUBTITLEME_PERSISTENCE=1`**:
   - Quando o usuário opta explicitamente por persistência em disco (`SUBTITLEME_PERSISTENCE=1`), `providers.json` armazena localmente no perfil privado do usuário (`~/.subtitleme/stremio-companion`, modo `0o600` em POSIX) a chave opcional da API v1 / URL do Subtitle Sync sem criptografia em repouso (`encryptedAtRest: false`, já declarado honestamente na documentação de segurança).

---

## 4. Próximas Ações Necessárias para Desbloquear `1.0.0 GA`

1. **Executar e arquivar o protocolo visual da Fase 3 no Stremio Desktop `5.0.28`** contra `dist/release/subtitleme-stremio-v1.0.0-rc.8.tar.gz`:
   - Salvar capturas reais da janela do player do Stremio Desktop (não da aba `/configure`) em `artifacts/stremio-visual-validation-rc8/screenshots/` cobrindo:
     1. Addon `SubtitleMe v1.0.0-rc.8` listado em **Meus Complementos**.
     2. Menu de legendas do player aberto exibindo múltiplos pares (`Dual EN+PT-BR 1..N`) em `Português (Brasil)` e `Inglês`.
     3. Quadro real de vídeo exibindo duas línguas simultâneas estilizadas (`.ASS` colorido) e modo nativo (`.SRT` branco), com posicionamento correto.
     4. Registro estruturado (`results-windows-rc8.json`) + capturas comprovando **Sincronização**, **Pause & Resume**, **Seek** (avanço/retrocesso), **Modo Reveal** (`+1s` sem pulo vertical da linha superior) e **Estabilidade contínua (10+ minutos)**.
2. **Na Fase 8 (após aprovação do Gate G3)**:
   - Alinhar versões para `1.0.0` em `apps/stremio-addon/package.json`, `manifest.ts` e nos `User-Agent` de `opensubtitles-discovery-provider.ts` / `opensubtitles-source.ts`, incluir `README.md` no empacotador standalone, gerar `subtitleme-stremio-v1.0.0.tar.gz` + `.sha256` (preservando `rc.8`) e validar instalação limpa final.
