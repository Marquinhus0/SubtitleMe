# SubtitleMe Stremio Addon — Compatibility Matrix (`1.0.0-rc.8` Audit)

**Data:** 2026-11-26  
**Versão Auditada:** `1.0.0-rc.8`  

---

## 1. Definições de Status

- **Testado (`Tested`)**: Validado ponta a ponta com evidências verificáveis e reproduzíveis no ambiente alvo.
- **Parcialmente Testado (`Partially Tested`)**: Camadas de protocolo HTTP, empacotamento ou instalação validadas, porém sem cobertura completa de todos os cenários visuais arquivados ou com restrições específicas de ambiente.
- **Não Testado (`Not Tested`)**: Nenhum teste em execução real foi realizado naquele sistema operacional ou cliente nesta auditoria.
- **Não Suportado (`Not Supported`)**: Incompatível arquiteturalmente com o modelo `127.0.0.1` loopback local do Companion.

---

## 2. Matriz Real de Plataformas e Clientes

| Ambiente / Cliente | Status | Evidência Efetivamente Comprovada & Limitações |
| :--- | :--- | :--- |
| **Windows 11 X64 — Companion CLI & Servidor HTTP (`start-companion.cmd`, `node dist/index.mjs`)** | **Testado** | Validado em Windows 11 X64 + Node.js `v24.19.0`: build, 134 testes automatizados, extração limpa em `C:\` fora do monorepo, execução de `bin\start-companion.cmd`, caminhos com espaços e acentos (`windows-entrypoint-launcher.test.ts`), persistência e segurança em `127.0.0.1`. |
| **Windows 11 X64 — Launcher PowerShell (`start-companion.ps1`)** | **Parcialmente Testado** | Contrato estático e caminhos com espaços validados; em instalações padrão do Windows com `ExecutionPolicy=Restricted`, requer execução via `powershell -NoProfile -ExecutionPolicy Bypass -File .\bin\start-companion.ps1` (por isso `start-companion.cmd` é o launcher primário recomendado no Windows). |
| **Stremio Desktop `5.0.28` no Windows 11 X64** | **Parcialmente Testado** | Instalação, comunicação PNA/CORS (`Access-Control-Allow-Private-Network: true`), descoberta multi-fonte e reprodução confirmadas pelo usuário durante testes da `rc.7`/`rc.8`; entretanto, **faltam artefatos visuais formais arquivados do player** para os 10 subcritérios da Fase 3 (bloqueador atual do Gate G3). |
| **Linux X64 — Companion CLI & Servidor HTTP (`start-companion.sh`)** | **Parcialmente Testado** *(Histórico Sprint 12–15; Não reexecutado na RC-8)* | Validado nativamente até a `1.0.0-rc.1` em Linux `6.18` / Node `v22.23.5` (incluindo `SIGTERM` graceful exit `0`). No host Windows desta auditoria, o teste de subprocesso `start-companion.sh` é pulado (`it.skipIf(process.platform === 'win32')`), portanto a `1.0.0-rc.8` não foi reexecutada em host Linux. |
| **Stremio Desktop no Linux** | **Não Testado** | Nenhuma execução visual do Stremio Desktop em Linux foi realizada. |
| **macOS (Companion & Stremio Desktop)** | **Não Testado** | Nenhum host macOS disponível; suporte não declarado. |
| **Stremio Web (`https://web.stremio.com` no mesmo PC Desktop)** | **Parcialmente Testado** *(Restrito ao mesmo host com PNA)* | Preflight Chromium Private Network Access (`OPTIONS` com `Origin: https://web.stremio.com` e `Access-Control-Request-Private-Network: true` → `204` com `Access-Control-Allow-Private-Network: true`) validado via HTTP (`stremio5-pna-and-dualsubs.test.ts`). Navegadores que bloqueiem conteúdo misto HTTP loopback sem exceção PNA não conseguirão acessar `http://127.0.0.1:7000`. |
| **Android (Smartphone / Tablet)** | **Não Suportado** | Dispositivos externos não alcançam `127.0.0.1` do computador e o Companion bloqueia explicitamente binding em `0.0.0.0` / LAN por segurança. |
| **Android TV / Google TV / Smart TVs / Fire TV** | **Não Suportado** | Incompatível com a arquitetura loopback `127.0.0.1` exclusiva da máquina local. |
| **iOS / iPadOS** | **Não Suportado** | Incompatível com a arquitetura loopback `127.0.0.1` exclusiva da máquina local. |
| **Extensão Chrome SubtitleMe (`apps/chrome-extension`)** | **Testado (Sem Regressão)** | Nenhum arquivo modificado na extensão; `pnpm build` + suíte Playwright Chromium real (`tests/e2e/chrome-extension.mjs`) aprovados em Windows 11 (`mount=34ms`, `srtImport=107ms`, `fiveVideos=228ms`, `pageErrors=0`). |

---

## 3. Matriz de Provedores de Legenda e Formatos de Saída

| Recurso | Status | Notas Técnicas |
| :--- | :--- | :--- |
| **Local Companion Store (`.srt` / `.vtt`)** | **Testado** | Upload validado via API local (`POST /companion/subtitles`), cache e invalidação imediata testados. |
| **Stremio OpenSubtitles v3 (`opensubtitles-v3.strem.io`)** | **Testado** | Validado em testes determinísticos e consulta real (`tt0903747:1:2`), 37 idiomas, preservação de `:` em episódios e fallback automático quando `videoHash` não possui um dos idiomas. |
| **Subtitle Sync (`subtitlesync.stream`)** | **Testado** | Validado com mock e teste real de conectividade; filtra automaticamente faixas marcadas como `⚠️ Não sincronizada` e prioriza faixas sincronizadas como âncora. |
| **OpenSubtitles REST API v1 (`api.opensubtitles.com/api/v1`)** | **Testado** | Validado com mock completo (200, 401, 429 `Retry-After`, 5xx retry único, timeout, cache de `/download` de 15 min) e sonda real de autenticação `200 OK`. |
| **Saída `.ASS` (Advanced SubStation Alpha)** | **Testado (HTTP/Parser) · Pendente Captura Real Player** | Gera cores BGR, escala de fonte `24–80px`, estilos `outline`/`box`/`clean` e alinhamento vertical; exige `Estilizar legendas ASS` ativo nas configurações do Stremio Desktop. |
| **Saída `.SRT` (SubRip Limpo)** | **Testado (HTTP/Parser) · Pendente Captura Real Player** | Acionado no modo `Branco SRT`; remove tags `<font>` para preservar os controles nativos de tamanho do player Stremio. |
| **Saída `.VTT` (WebVTT)** | **Testado (HTTP/Parser)** | Mantido no modo clássico de compatibilidade (`pairCount` omitido) com posicionamento `line:XX%` e acentuação UTF-8 completa. |
