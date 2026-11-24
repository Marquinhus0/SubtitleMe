# SubtitleMe — Windows Native Validation Report (Sprint 15.1)

**Product**: SubtitleMe (`@subtitleme/stremio-addon`)  
**Version Tested**: `1.0.0-rc.1` (preserved untouched)  
**Date**: 2026-11-23  
**Git Commit**: `da81115`  
**Final GA Recommendation**: **`NO-GO`**

---

## 1. Resumo Executivo

A validação nativa no ambiente Windows 11 (`X64`, Node.js `v24.19.0`, Stremio Desktop `5.0.28`) foi executada sobre o artefato original `dist/release/subtitleme-stremio-v1.0.0-rc.1.tar.gz` (SHA-256 verificado com sucesso).

Embora o núcleo HTTP do Local Companion, o parser SRT/WebVTT, a persistência opcional em disco e os controles de segurança tenham sido **aprovados nativamente no Windows**, a validação revelou **3 problemas reais no ambiente Windows** (dois deles críticos para distribuição RC/GA) e a **validação visual no player do Stremio Desktop (Cenários 3–15) não pôde ser concluída** (status `BLOCKED`), resultando na decisão **`NO-GO`** para promoção a `1.0.0` GA.

---

## 2. Ambiente Windows

Ver detalhes completos em [environment-report.md](./environment-report.md).

- **OS**: Microsoft Windows NT `10.0.26300.0` (Windows 11)
- **Arquitetura**: `X64`
- **PowerShell ExecutionPolicy**: Todos os escopos (`MachinePolicy`, `UserPolicy`, `Process`, `CurrentUser`, `LocalMachine`) = `Undefined` (política efetiva padrão: `Restricted`). Não alterada globalmente.
- **Gerenciadores de pacotes**: `npm.cmd` `11.17.0` (`npm.ps1` bloqueado pela ExecutionPolicy); `pnpm` não instalado.

---

## 3. Versão do Stremio

- **Stremio Desktop**: Instalado em `%LOCALAPPDATA%\Programs\Stremio`
- **Executável principal**: `stremio-shell-ng.exe` — versão **`5.0.28`** (Stremio 5 Desktop)
- **Runtime**: `stremio-runtime.exe` — versão `18.12.1`
- **Processos ativos no início**: Nenhum (`Get-Process *stremio*` vazio)

---

## 4. Versão do Node.js

- **Node.js**: `v24.19.0` (compatível com requisito `>= 22`)

---

## 5. Integridade SHA-256 do Release Candidate

- **Artefato**: `dist/release/subtitleme-stremio-v1.0.0-rc.1.tar.gz` (36.570 bytes)
- **SHA-256 Esperado**: `8000c945caf0e21c9f4f167aeada96eba258d39830b59b0791dff8fda8caf385`
- **SHA-256 Obtido**: `8000c945caf0e21c9f4f167aeada96eba258d39830b59b0791dff8fda8caf385`
- **Status**: **PASS (Idêntico)**
- **Conteúdo inspecionado no TAR.GZ** (extraído para diretório isolado, preservando o pacote original):
  - `package.json` (492 bytes)
  - `dist/index.mjs` (136.960 bytes)
  - `bin/start-companion.sh` (1.364 bytes)
  - `bin/start-companion.ps1` (1.656 bytes)

---

## 6. Resultado do Launcher (`start-companion.ps1`)

1. **Execução direta (`.\bin\start-companion.ps1`)**: **FAIL** — bloqueado pela `ExecutionPolicy` padrão do Windows (`PSSecurityException / UnauthorizedAccess`). A política global **não** foi alterada.
2. **Execução isolada do RC (`node dist/index.mjs`)**: **FAIL** — `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'stremio-addon-sdk'`. O bundle `dist/index.mjs` importa `stremio-addon-sdk` externamente, o pacote não é distribuído no tarball e `package.json` mantém dependências `"workspace:*"` incompatíveis com `npm install`.
3. **Execução após instalação isolada autorizada de `stremio-addon-sdk@^1.6.10` no diretório de validação**:
   - Via `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "...\start-companion.ps1"` (sem espaço no caminho): **PASS** — verificou Node 22+, iniciou em `http://127.0.0.1:7000`, `GET /companion/health` retornou `200 OK`.
   - **Conflito de porta (`7000` ocupada)**: **PASS** — encerrou com código `1` e mensagem clara: `[SubtitleMe Companion] Port 7000 is already in use on 127.0.0.1. Set PORT=<other> to use a different port.`
   - **Diretório contendo espaços (`path with spaces`)**: **FAIL (BUG CRÍTICO)** — embora `start-companion.ps1` faça quoting correto do caminho, `apps/stremio-addon/src/index.ts` verifica `import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))`. Como `import.meta.url` codifica espaços como `%20` enquanto `process.argv[1]` mantém espaço literal, `isDirectRun` retorna `false` e o processo sai silenciosamente com código `0` sem iniciar o servidor (`ECONNREFUSED`).
4. **Binding de rede (`netstat -ano`)**: **PASS** — `TCP 127.0.0.1:7000 0.0.0.0:0 LISTENING` (PID `26248`). Nenhuma interface LAN/externa exposta.

---

## 7. Resultado HTTP

Executado nativamente contra `dist/index.mjs` no Windows (`Node.js v24.19.0`):

- `GET /companion/health`: `200 OK` (`{"ok":true,"service":"subtitleme-local-companion","host":"127.0.0.1","localOnly":true,"registeredSubtitles":0}`)
- `GET /manifest.json`: `200 OK` (`id: "com.subtitleme.addon"`, `version: "1.0.0-rc.1"`, `resources: ["subtitles"]`)
- `GET /configure`: `200 OK` (HTML servido com token efêmero de 256 bits / 64 caracteres hex)
- `POST /companion/install-url`: `200 OK` (retornou `httpManifestUrl` em `127.0.0.1` e `stremioDeepLink`)
- `GET /<config>/subtitles/movie/tt1254207.json`: `200 OK` (1 faixa bilíngue retornada)
- `GET /generated/<opaqueToken>.vtt`: `200 OK`, `Cache-Control: private, no-store`, UTF-8 íntegro
- `GET /<config>/subtitles/movie/tt2285752.json` (apenas 1 idioma enviado): `200 OK`, `{"subtitles":[]}`

---

## 8. Resultado de Importação

Fixtures autorais criadas para conteúdos Creative Commons (`tt1254207` Big Buck Bunny, `tt1727587` Sintel, `tt2285752` Tears of Steel) cobrindo acentuação (`áéíóúãõç — «SubtitleMe»`), cues simultâneos, sobrepostos e multilinha:

- Upload `.vtt` (`en`) + `.srt` (`pt-BR`) para `tt1254207`: `201 Created`
- Upload `.vtt` (`en`) + `.srt` (`pt-BR`) para `tt1727587`: `201 Created`
- Upload `.vtt` (`en` apenas) para `tt2285752`: `201 Created`
- `POST /companion/preview` (`primary-top`, offsets `0/0`): `200 OK`, inglês acima de português, acentuação preservada.
- `POST /companion/preview` (`secondary-top`, `primaryOffsetMs: 2000`, `secondaryOffsetMs: -500`): `200 OK`, ordem invertida e deslocamentos independentes confirmados (`startTime: 500ms` para português).
- Isolamento de conteúdo: VTT de `tt1727587` contém apenas cues de Sintel.
- Exclusão (`DELETE /companion/subtitles/:id`): `200 OK` e URL VTT anterior passou imediatamente a retornar `404 Not Found`.
- Nenhum arquivo local foi enviado ao OpenSubtitles.

---

## 9. Resultado de Persistência e Ciclo de Vida

Validado exclusivamente em diretório de dados isolado (`SUBTITLEME_DATA_DIR` temporário, removido ao final; diretório real do usuário não tocado):

- **Estado padrão**: `enabled: false` (memória apenas).
- **Consentimento explícito (`POST /companion/storage/consent` `{ enabled: true }`)**: `200 OK`.
- **Gravação em disco**: Arquivos criados sob nomes internos aleatórios UUID (`.srt`, `.vtt`) + `index.json`.
- **Recuperação após reinicialização (`SUBTITLEME_PERSISTENCE=1`)**:
  - Arquivo órfão `index.json.tmp.deadbeef` removido automaticamente (`cleanedTempFiles: 1`).
  - Registros recuperados com integridade: `recoveredCount: 2`, `corruptedSkippedCount: 0`, `listedTracksAfterRestart: 2`.
- **Exclusão individual (`DELETE /companion/subtitles/:id`)**: `200 OK`, arquivo interno correspondente removido do disco.
- **Limpeza total (`DELETE /companion/subtitles`)**: `200 OK`, diretório de dados ficou vazio (`[]`).
- **Encerramento**: Processo encerrado sem deixar arquivos `.tmp.*` órfãos.

---

## 10. Resultado dos 15 Cenários

Ver tabela estruturada completa em [results-windows.json](./results-windows.json).

| # | Cenário | Protocolo/HTTP (Windows Nativo) | Visual Stremio Desktop (`5.0.28`) | Status Final |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Inicialização do Companion | Parcial (falha RC standalone, ExecutionPolicy e espaço no caminho; OK com SDK isolado sem espaço) | N/A | **FAIL** |
| 2 | Acesso ao Manifest | PASS (`200 OK`, JSON válido) | Sem screenshot (Chrome DevTools desativado) | **PASS** |
| 3 | Instalação do addon no Stremio Desktop | PASS (`install-url` gerado) | Não executado (GUI não automatizada) | **BLOCKED** |
| 4 | Reconhecimento da faixa | PASS (1 faixa retornada) | Não executado | **BLOCKED** |
| 5 | Seleção da legenda bilíngue | PASS (VTT `200 OK`) | Não executado | **BLOCKED** |
| 6 | Renderização simultânea | PASS (VTT combinado) | Não executado | **BLOCKED** |
| 7 | Ordem das legendas | PASS (`primary-top` vs `secondary-top`) | Não executado | **BLOCKED** |
| 8 | Offsets independentes | PASS (`+2000ms` / `-500ms`) | Não executado | **BLOCKED** |
| 9 | Cues simultâneos | PASS (sem duplicação) | Não executado | **BLOCKED** |
| 10 | Cues sobrepostos | PASS (merge limpo) | Não executado | **BLOCKED** |
| 11 | Cues multilinha | PASS (quebras preservadas) | Não executado | **BLOCKED** |
| 12 | Acentuação e caracteres especiais | PASS (`áéíóúãõç — «SubtitleMe»` UTF-8) | Não executado | **BLOCKED** |
| 13 | Troca de conteúdo | PASS (`tt1254207` vs `tt1727587` isolados) | Não executado | **BLOCKED** |
| 14 | Ausência de uma das faixas | PASS (`{ subtitles: [] }`) | Não executado | **BLOCKED** |
| 15 | Exclusão e atualização | PASS (VTT anterior → `404` imediato) | Não executado | **BLOCKED** |

---

## 11. Screenshots Reais

- Diretório criado: `artifacts/windows-validation/screenshots/`
- **Nenhum screenshot foi gerado ou simulado** (conforme Regra 12): o ambiente não possui automação GUI para o executável nativo `stremio-shell-ng.exe`, o Chrome não estava com remote debugging ativo, e o usuário optou por encerrar a validação sem a etapa manual interativa no player.

---

## 12. Problemas Encontrados

1. **[CRÍTICO — Empacotamento do RC] `dist/index.mjs` não executa de forma autônoma**: O tarball `subtitleme-stremio-v1.0.0-rc.1.tar.gz` externaliza `stremio-addon-sdk` sem incluí-lo em `node_modules` ou no bundle, e seu `package.json` contém especificadores `"workspace:*"` (que falham em `npm install` fora do monorepo pnpm).
2. **[CRÍTICO — Bug Windows em Caminhos com Espaços] `src/index.ts` falha silenciosamente**: A verificação `import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))` compara URL percent-encoded (`%20`) com caminho literal contendo espaço, resultando em `isDirectRun === false` e saída silenciosa com código `0`. Qualquer usuário Windows cujo perfil contenha espaço (ex.: `C:\Users\Nome Sobrenome\...`) não consegue iniciar o Companion.
3. **[MÉDIO — UX Windows PowerShell] `start-companion.ps1` bloqueado por padrão**: Em instalações padrão do Windows onde `ExecutionPolicy` é `Undefined` (`Restricted`), executar `.\bin\start-companion.ps1` resulta em `UnauthorizedAccess`. A documentação precisa instruir execução explícita por processo (`powershell -ExecutionPolicy Bypass -File ...`) ou um launcher `.cmd` / `node dist/index.mjs`.

---

## 13. Correções Realizadas e Regressão

- **Nenhuma alteração foi feita no código-fonte, na versão `1.0.0-rc.1`, no artefato RC original, em packages compartilhados ou na extensão Chrome.**
- **Regressão (Seção 13)**: Como não houve alterações no código, os testes de regressão (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:browser`) **não foram reexecutados** (inclusive `pnpm` não está instalado neste host); os resultados anteriores do repositório permanecem preservados sem afirmação de nova execução.

---

## 14. Segurança Windows

Todos os controles HTTP e de validação foram testados ao vivo contra o Companion rodando nativamente no Windows:

| Controle | Resultado Observado no Windows | Status |
| :--- | :--- | :--- |
| Binding loopback (`127.0.0.1`) | `netstat -ano` confirmou `127.0.0.1:7000` apenas; `HOST=0.0.0.0` ignorado; `assertLoopbackHost('0.0.0.0')` e `'192.168.1.10'` lançam erro | **PASS** |
| DNS Rebinding (`Host: evil.com:7011`) | `403 Forbidden` (`Invalid Host header`) | **PASS** |
| Origin estrangeira (`https://evil.example`) | `403 Forbidden` (`Forbidden origin`) | **PASS** |
| CSRF (`POST` sem `X-SubtitleMe-CSRF: 1`) | `403 Forbidden` (`Missing required CSRF protection header`) | **PASS** |
| CORS separação | `/manifest.json` retorna `*`; `/companion/*` `OPTIONS` estrangeiro retorna `403` sem `Access-Control-Allow-Origin` | **PASS** |
| Autenticação & Sessão | Sem token / token inválido → `401`; `POST /companion/session/revoke` → `200` e token antigo imediatamente → `401` | **PASS** |
| Path traversal (`filename`, `contentId`) | `400 Bad Request` (`../../etc/passwd.srt`, `../evil` bloqueados) | **PASS** |
| Injeção (`<script>`, null bytes, `filePath`) | `400 Bad Request` em todos os casos | **PASS** |
| Sanitização de erros | Sem stack traces, caminhos internos ou tokens expostos | **PASS** |
| Fallback `O_NOFOLLOW` no Windows | Confirmado nativamente: `fs.constants.O_NOFOLLOW === undefined` → fallback `0` | **DOCUMENTADO** |

**Limitações NTFS / Windows documentadas honestamente**:
- A proteção POSIX baseada em `O_NOFOLLOW` a nível de kernel **não é equivalente no Windows** (`O_NOFOLLOW` é `undefined`, caindo para `0`); a defesa contra symlinks/reparse points no Windows depende de `lstatSync` + `assertPathInsideDir`, mantendo uma janela TOCTOU estreita sob escrita concorrente do mesmo usuário local.
- Permissões POSIX (`0o700` / `0o600` via `chmodSync`) não se traduzem em ACLs NTFS restritivas; a confidencialidade depende da ACL padrão do perfil do usuário Windows.
- `ExecutionPolicy` padrão do Windows bloqueia scripts `.ps1` não assinados.

---

## 15. OpenSubtitles & Limitações

- **OpenSubtitles**: `OPENSUBTITLES_API_KEY` **não configurada** neste ambiente. Nenhuma chamada externa foi executada. Funcionalidade mantida experimental, desabilitada por padrão e classificada como **`Partially Tested`**.
- **Validação Visual GUI**: Cenários 3–15 no Stremio Desktop `5.0.28` permanecem **`BLOCKED`** (sem evidência visual de reprodução).
- **Linux**: Esta validação Windows **não** substitui validação gráfica Linux.

---

## 16. Matriz de Compatibilidade Atualizada

| Plataforma / Escopo | Status Atual | Evidência |
| :--- | :--- | :--- |
| **Windows 11 X64 — Protocolo HTTP, Persistência e Segurança** | **Partially Tested (com 2 bugs críticos de empacotamento/caminho)** | Executado nativamente em Node `v24.19.0` |
| **Windows 11 X64 — Stremio Desktop `5.0.28` (Player Visual)** | **Blocked / Not Visually Verified** | Cenários 3–15 sem execução GUI/screenshots |
| **Linux Desktop (Player Visual)** | **Partially Tested** | Protocolo validado em Sprint 12; sem execução gráfica Linux |
| **macOS** | **Not Evaluated** | Não testado |
| **OpenSubtitles Live API v1** | **Partially Tested** | Sem chave configurada; permanece opt-in e desabilitado por padrão |

---

## 17. Recomendação de GA

### Decisão Final: **`NO-GO`**

**Justificativa objetiva**:
1. **Bloqueio de empacotamento no RC**: O artefato `subtitleme-stremio-v1.0.0-rc.1.tar.gz` não é executável de forma independente (`ERR_MODULE_NOT_FOUND: stremio-addon-sdk` e `"workspace:*"` no `package.json`).
2. **Bloqueio funcional no Windows em caminhos com espaços**: `src/index.ts` (`isDirectRun`) falha silenciosamente com código `0` sempre que o diretório contém espaços.
3. **Experiência bilíngue visual não comprovada**: Nenhum dos cenários de player no Stremio Desktop (`5.0.28`) foi executado visualmente com screenshots reais.

**Próximos passos necessários antes de um novo RC (`1.0.0-rc.2`)**:
1. Corrigir `isDirectRun` em `apps/stremio-addon/src/index.ts` usando `pathToFileURL(process.argv[1]).href === import.meta.url`.
2. Empacotar `stremio-addon-sdk` no bundle ou gerar um `package.json` de distribuição sem `"workspace:*"` com instruções claras de instalação/execução Windows (incluindo alternativa à `ExecutionPolicy` padrão).
3. Executar a validação visual real (Cenários 1–15 com screenshots reais) no Stremio Desktop (`5.0.28`) após o novo RC.
