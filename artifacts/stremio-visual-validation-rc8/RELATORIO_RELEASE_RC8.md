# SubtitleMe Stremio Addon — Relatório Técnico & Validação Real (`v1.0.0-rc.8`)

**Data:** 2026-11-26  
**Versão:** `1.0.0-rc.8`  
**Artefato Standalone:** `dist/release/subtitleme-stremio-v1.0.0-rc.8.tar.gz` (`2.471.190` bytes · `5.628` arquivos)  
**SHA-256:** `c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`  
**Ambiente Validado:** Windows 11 X64 · Node.js `v24.19.0` · Stremio Desktop `5.0.28` (WebView2 + MPV/ASS)

---

## 1. Resumo Executivo

A release **`1.0.0-rc.8`** consolida o motor bilíngue dinâmico do **SubtitleMe** para Stremio com sincronização multi-fonte de alta precisão, múltiplos pares ranqueados no menu do player, modo de aprendizado **Reveal** sem deslocamento vertical e uma interface **SubtitleMe Studio** autoral minimalista em paleta verde esmeralda/menta (`#10B981` / `#34D399`) com linhas finas (`1px` hairline) e atualização em tempo real sem necessidade de reinstalar o addon.

---

## 2. Arquitetura & Funcionalidades Entregues (`rc.7` → `rc.8`)

### 2.1. Descoberta Multi-Fonte & Economia Inteligente de Cota
- **37 Idiomas Suportados** ([addon-config.ts](../../apps/stremio-addon/src/config/addon-config.ts)): suporte completo a códigos BCP-47, ISO 639-2 e aliases nativos do ecossistema Stremio (`pob`, `por`, `eng`, `spa`, `fre`, `ger`, `ita`, `jpn`, `kor`, `chi`, `rus`, `tur`, `ara`, `dut`, `pol`, `swe`, etc.).
- **Seleção de Motor por Idioma (`learnSrc` / `nativeSrc`)** ([subtitle-matcher.ts](../../apps/stremio-addon/src/discovery/subtitle-matcher.ts), [discovery-orchestrator.ts](../../apps/stremio-addon/src/discovery/discovery-orchestrator.ts)): permite escolher `Auto`, `Subtitle Sync` ou `OpenSubtitles` individualmente para o idioma de estudo e para o idioma nativo.
- **Filtragem de Faixas Não-Sincronizadas no Subtitle Sync** ([subtitle-sync-provider.ts](../../apps/stremio-addon/src/discovery/subtitle-sync-provider.ts)): ignora faixas marcadas com `⚠️ Não sincronizada` (que injetam avisos de diagnóstico), priorizando faixas efetivamente sincronizadas por áudio/vídeo e preservando a cota diária da API v1 usando `OpenSubtitles v3` ilimitado quando a qualidade de match é equivalente.

### 2.2. Sincronização Bidirecional, Regressão de Drift & Anti-Flicker
- **Ancoragem Bidirecional (`syncAnchor`)** ([discovery-orchestrator.ts](../../apps/stremio-addon/src/discovery/discovery-orchestrator.ts)): identifica qual das duas legendas possui vínculo mais forte com o arquivo de vídeo (`Subtitle Sync` / `moviehash` / similaridade de release `WEB-DL`, `BluRay`, `-GROUP`) e alinha o outro idioma sobre essa âncora.
- **Votação Multi-Escala + Regressão Linear de Drift + Trava Anti-Flicker (`380ms`)** ([auto-sync.ts](../../apps/stremio-addon/src/delivery/auto-sync.ts)): corrige diferenças de corte/introdução e derivações de FPS (`23.976` ↔ `24` ↔ `25`), encaixando início e fim das duas falas no mesmo milissegundo para eliminar piscadas visuais entre linhas.

### 2.3. Múltiplos Pares Ranqueados, Modo Reveal & Entrega `.ASS` / `.SRT`
- **1 a 5 Opções Ranqueadas em Ambos os Idiomas no Menu do Stremio** ([subtitles-handler.ts](../../apps/stremio-addon/src/addon/subtitles-handler.ts)): gera até 5 combinações distintas ordenadas pela porcentagem real de sobreposição das falas (ex.: `Dual EN+PT-BR 1 (Sync/Sync) · 96%`, `Dual EN+PT-BR 2 (OS/OS) · 88%`) e publica tanto sob o código do idioma nativo (`pob`) quanto sob o idioma de estudo (`eng`).
- **Modo Reveal sem Pulo Vertical (`revealMs`)** ([subtitle-file-service.ts](../../apps/stremio-addon/src/delivery/subtitle-file-service.ts)): divide falas sobrepostas em `[início → início + delay]` com linhas `<i>&nbsp;</i>` (`\u00A0`) reservando a altura exata da tradução e `[início + delay → fim]` com a tradução visível, impedindo que a linha superior salte na tela.
- **Seleção Automática `.ASS` vs `.SRT`**: entrega `.ass` (`text/x-ssa`) quando cores, escala de fonte (`28–68px`), caixa translúcida ou posição vertical customizada estão ativas, e `.srt` (`application/x-subrip`) no modo `Branco SRT` para respeitar os controles nativos do Stremio.

### 2.4. Painel Autoral SubtitleMe Studio (`/configure`)
- **Identidade Esmeralda Minimalista & Grid Contido** ([configure-page.ts](../../apps/stremio-addon/src/configure/configure-page.ts)): fundo obsidiana `#070B09`, destaques menta/esmeralda `#10B981` / `#34D399`, bordas finas (`1px` hairline), monitor widescreen interativo no topo, card de prévia do menu do Stremio com truncamento elíptico seguro (`minmax(0, ...)` + `min-width: 0` sem overflow horizontal) e painel Bento em 3 colunas com auto-save instantâneo em `/companion/settings` e diagnóstico de motores em `/companion/opensubtitles/test`.

---

## 3. Matriz de Qualidade, Segurança & Testes

| Verificação | Escopo | Resultado |
| :--- | :--- | :--- |
| **TypeScript (`tsc --noEmit`)** | `apps/stremio-addon` | **PASS** (`0` erros) |
| **Bundle SSR (`vite build`)** | `apps/stremio-addon/dist/index.mjs` (`266.99 kB`) | **PASS** |
| **Static Analysis (`eslint`)** | `apps/stremio-addon/src` & `tests` | **PASS** (`0` erros / `0` avisos) |
| **Suíte Automatizada (`vitest run`)** | `34` arquivos · `134` testes unitários, integração e segurança | **PASS** (`100%`) |
| **Auditoria de Segredos & Rede** | Loopback exclusivo `127.0.0.1`, token + CSRF + Host check, zero vazamento de chaves | **PASS** |
| **Validação Real no Stremio Desktop `5.0.28`** | Subtitle Sync + OpenSubtitles v1/v3 + Cores ASS + Edição Ao Vivo confirmados pelo usuário | **PASS** |
