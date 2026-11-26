# SubtitleMe Stremio Addon — Functional & Visual Validation Audit (`1.0.0-rc.8`)

**Data:** 2026-11-26  
**Versão Auditada:** `1.0.0-rc.8` (`SHA-256: c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`)

Este documento separa explicitamente a comprovação obtida em **testes unitários**, **integração HTTP**, **subprocesso standalone limpo** e **validação visual real no Stremio Desktop `5.0.28`**.

---

## 1. Fase 2 — Auditoria Funcional dos 16 Critérios

| # | Funcionalidade | Módulo(s) | Teste Unitário / Vitest | Integração HTTP / Subprocesso Limpo (`C:\`) | Status Funcional |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Descoberta de legendas** | `discovery-orchestrator.ts`, `local-discovery-provider.ts`, `subtitle-sync-provider.ts`, `stremio-opensubtitles-v3-provider.ts`, `opensubtitles-discovery-provider.ts` | `subtitle-discovery.test.ts`, `stremio5-pna-and-dualsubs.test.ts` | Verificado em subprocesso standalone e mock multi-provedor | **PASS** |
| 2 | **Matching de conteúdo** | `content-identifier.ts`, `subtitle-matcher.ts` | `subtitle-discovery.test.ts` (`tt1254207`, `tt0903747%3A1%3A2`, `tmdb:10378`, `kitsu:7442:3`, bloqueio entre episódios distintos) | Verificado via `GET /subtitles/movie/...` e `/subtitles/series/...` | **PASS** |
| 3 | **Matching dos dois idiomas** | `subtitle-matcher.ts`, `release-similarity.ts` | `subtitle-discovery.test.ts`, `dualsubs-replication.test.ts` (co-release `WEB-DL`/`BluRay` + faixa `dual-notice` ou `[]` quando falta idioma) | Verificado com múltiplos releases | **PASS** |
| 4 | **Geração de até cinco pares** | `selectRankedCandidatePairs()`, `resolveMultipleBilingualPairs()` | `dualsubs-replication.test.ts` (`pairCount: 2`) | Verificado com `pairCount: 5` no pacote standalone (`5 pares × 2 idiomas = 10 faixas`) | **PASS** |
| 5 | **Ranking por sobreposição** | `computeCueSyncPercent()`, `subtitles-handler.ts` | `dualsubs-replication.test.ts` | Verificado: ordenação decrescente `100%`, `90%`, `70%` priorizando âncora `Sync` | **PASS** |
| 6 | **Entrega das opções ao Stremio** | `subtitles-handler.ts`, `routes.ts` | `dualsubs-replication.test.ts`, `stremio5-pna-and-dualsubs.test.ts` | Verificado: publicação dupla em `lang: "pob"` e `lang: "eng"` com CORS + PNA | **PASS** |
| 7 | **Geração de VTT quando aplicável** | `subtitle-file-service.ts` | `stremio-addon.test.ts`, `companion.test.ts`, `vtt-rendering-edge-cases.test.ts` | Verificado no pacote standalone (`CLASSIC_VTT_SUBS: 1 vtt`, `text/vtt`) | **PASS** |
| 8 | **Geração de ASS estilizado** | `convertVttToAss()` (`subtitle-file-service.ts`) | `live-settings-ass.test.ts`, `dualsubs-replication.test.ts` | Verificado no pacote standalone (`Fontsize=50`, `BorderStyle=3`, cores BGR, `text/x-ssa`) | **PASS** |
| 9 | **Geração de SRT limpo** | `convertVttToSrt()`, `resolveDualSubsOutputFormat()` | `dualsubs-replication.test.ts` | Verificado no pacote standalone (`Branco SRT`: sem `<font>`, `application/x-subrip`) | **PASS** |
| 10 | **Seleção de fontes por idioma** | `filterCandidatesBySourcePreference()` | `dualsubs-replication.test.ts` (`learnSrc: 'os'`, `nativeSrc: 'auto'/'sync'`) | Verificado no pacote standalone (`OS/Sync` isolado por idioma) | **PASS** |
| 11 | **Configuração dos 37 idiomas** | `addon-config.ts` (`STREMIO_SUPPORTED_LANGUAGES`) | `dualsubs-replication.test.ts` (`toHaveLength(37)` + aliases `pob`, `fre`, `ger`, `chi`, `dut`, `tur`, `kor`) | Verificado em `/manifest.json` (`LANG_OPTIONS: 37`) e `/configure` | **PASS** |
| 12 | **Offset independente** | `config-validator.ts`, `subtitle-file-service.ts` | `stremio-addon.test.ts`, `companion.test.ts`, `vtt-rendering-edge-cases.test.ts` | Verificado no pacote standalone (`primaryOffsetMs: 500`, `secondaryOffsetMs: 1500` → `00:00:11,500`) | **PASS** |
| 13 | **Modo Reveal** | `splitSecondaryCuesForReveal()` (`subtitle-file-service.ts`) | `dualsubs-replication.test.ts` (`revealMs: 1000`, `<i>\u00A0</i>` sem atraso em placas isoladas) | Verificado em SRT e ASS (`10.00->11.00` placeholder + `11.00->11.80` revelado) | **PASS** |
| 14 | **Ancoragem bidirecional** | `computeVideoSyncRank()`, `alignCuesToAnchor()`, `refineLinearDrift()` | `live-settings-ass.test.ts` (`-4200ms` alinhado na âncora `secondary`), `stremio5-pna-and-dualsubs.test.ts` | Verificado no pacote standalone (`-3200ms` alinhado sobre âncora `Sync`) | **PASS** |
| 15 | **Proteção anti-flicker** | `snapCueBoundariesToAnchor()` (`auto-sync.ts`, tolerância `380ms`) | `live-settings-ass.test.ts` | Verificado no pacote standalone (`+140ms` de jitter travado em `0:00:10.00`) | **PASS** |
| 16 | **Persistência e cache** | `CompanionPersistence`, `RuntimeSettingsStore`, `GeneratedSubtitleCache` | `persistence.test.ts`, `cache-security.test.ts`, `subtitle-discovery.test.ts` | Verificado no pacote standalone (recuperação de `settings.json` após restart e invalidação `404` ao remover fonte) | **PASS** |

---

## 2. Fase 3 — Auditoria de Evidências Visuais Reais no Stremio Desktop `5.0.28`

Conforme a diretriz da Fase 3 (*"Não aceitar screenshots de mockups ou simulações como evidência. Se os artefatos de evidência não existirem, marcar o critério como pendente e solicitar nova execução"*):

| # | Critério Visual no Stremio Desktop `5.0.28` | Evidência Existente no Repositório | Status na Auditoria GA |
| :--- | :--- | :--- | :--- |
| 1 | **Addon instalado** | Relato real do usuário em sessões de validação (`rc.2`, `rc.3`, `rc.7`, `rc.8`); sem screenshot arquivado da tela de Complementos do Stremio na `rc.8`. | **PENDING (Sem captura arquivada da `rc.8`)** |
| 2 | **Opções de legenda visíveis** | Validado via HTTP + relato verbal do usuário (`rc.8`); sem captura real do menu do player Stremio arquivada. | **PENDING (Sem captura arquivada)** |
| 3 | **Duas línguas simultâneas** | Validado via HTTP (`.ASS`/`.SRT`/`.VTT`) + relato verbal do usuário; capturas enviadas na conversa mostram apenas o simulador `/configure`, não o player do Stremio. | **PENDING (Sem captura real do player)** |
| 4 | **Múltiplos pares no menu, quando disponíveis** | Comprovado via HTTP (`Dual 1..5` em `pob` e `eng`); sem captura real do menu do player Stremio. | **PENDING (Sem captura real do player)** |
| 5 | **Posicionamento correto** | Comprovado na geração `.ASS` (`Alignment`, `MarginV`) e `.VTT` (`line:%`); sem captura real no player Stremio. | **PENDING (Sem captura real do player)** |
| 6 | **Sincronização** | Comprovada matematicamente em testes e relatada verbalmente pelo usuário; sem log estruturado/captura em reprodução real da `rc.8`. | **PENDING (Sem artefato formal arquivado)** |
| 7 | **Pause e resume** | Não há artefato ou registro de teste visual específico da `rc.8` no Stremio Desktop `5.0.28`. | **PENDING (Nova execução solicitada)** |
| 8 | **Seek (avanço e retrocesso na timeline)** | Não há artefato ou registro de teste visual específico da `rc.8` no Stremio Desktop `5.0.28`. | **PENDING (Nova execução solicitada)** |
| 9 | **Modo Reveal no player real** | Comprovado no payload `.SRT`/`.ASS` gerado; não há captura/vídeo no player real comprovando ausência de pulo vertical em tela. | **PENDING (Nova execução solicitada)** |
| 10 | **Estabilidade durante reprodução** | Não há log formal de sessão contínua (ex.: 10+ min sem vazamento/dessincronia) na `rc.8`. | **PENDING (Nova execução solicitada)** |

---

## 3. Registro da Regressão Completa Executada (Fase 6)

Todos os comandos abaixo foram executados em `2026-11-26` sobre `main @ 1c6e866` em Windows 11 X64 (`Node.js v24.19.0`, `Corepack pnpm 12.21.0`):

1. **Typecheck completo do monorepo (`8/8` pacotes)**:
   - Comando: `corepack pnpm -r typecheck`
   - Resultado: **PASS** (`shared-types`, `subtitle-core`, `subtitle-parser`, `subtitle-storage`, `subtitle-renderer`, `subtitle-sync`, `stremio-addon`, `chrome-extension` — `0` erros).
2. **Lint completo do repositório**:
   - Comando: `.\node_modules\.bin\eslint.cmd .`
   - Resultado: **PASS** (`0` erros, `0` avisos).
3. **Build de produção completo do monorepo**:
   - Comando: `corepack pnpm -r build`
   - Resultado: **PASS** (`apps/stremio-addon/dist/index.mjs` `266.88 kB`; `apps/chrome-extension/dist/*` gerado sem erros).
4. **Suíte automatizada completa (Unit + Integração + Companion + Segurança)**:
   - Comando: `.\node_modules\.bin\vitest.cmd run`
   - Resultado: **PASS** (`34 passed (34)` arquivos · `134 passed | 1 skipped (135)` em `9.85s`; o único teste `skipped` é `start-companion.sh` específico de Linux via `it.skipIf(process.platform === 'win32')`).
5. **Suíte E2E Real da Extensão Chrome em Chromium**:
   - Comando: `$env:CHROME_PATH='...\ms-playwright\chromium-1234\chrome-win64\chrome.exe'; node tests/e2e/chrome-extension.mjs`
   - Resultado: **PASS** (`mount=34ms`, `srtImport=107ms`, `fiveVideos=228ms`, `pageErrors=0`).
6. **Extração e Execução Standalone Limpa Fora do Monorepo**:
   - Extração de `dist/release/subtitleme-stremio-v1.0.0-rc.8.tar.gz` em diretório limpo no drive `C:\` (isolado de `E:\SubtitleMe\SubtitleMe`), inicialização via `cmd.exe /c bin\start-companion.cmd` e bateria HTTP de 16 pontos + persistência + bloqueio de DNS rebinding.
   - Resultado: **PASS** (`0` erros).
