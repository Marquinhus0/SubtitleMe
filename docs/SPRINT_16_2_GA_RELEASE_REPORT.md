# SUBTITLEME — SPRINT 16.2 GA RELEASE REPORT (`v1.0.0`)

**Data:** 2026-11-26  
**Componente:** `@subtitleme/stremio-addon`  
**Ambiente de Validação:** Windows 11 X64 · Node.js `v24.19.0` · npm `11.17.0` · Corepack pnpm `12.21.0` · Stremio Desktop `5.0.28`

---

## 1. Decisão Final

### **`GO` — Release GA `v1.0.0` Aprovada e Finalizada Localmente**

Todos os **14 critérios de aceitação** da Sprint 16.2 foram comprovados com evidências reais. A promoção técnica de `1.0.0-rc.8` para `1.0.0` foi concluída com preservação integral do histórico de RCs e sem execução de commit, `git push` ou publicação externa.

---

## 2. Versão Final

- **Versão GA Oficial:** `1.0.0`
- **Artefato Oficial:** `dist/release/subtitleme-stremio-v1.0.0.tar.gz`
- **Checksum Oficial:** `dist/release/subtitleme-stremio-v1.0.0.sha256`

---

## 3. Branch e Estado do Git

- **Branch:** `main`
- **HEAD Inicial:** `1c6e866dc10ee2bbb335adecb3b8351cb7eb8199`
- **HEAD Final:** `1c6e866dc10ee2bbb335adecb3b8351cb7eb8199` *(nenhum commit ou push executado sem autorização explícita)*
- **Integridade do Escopo:** zero alterações em `apps/chrome-extension/` e `packages/*`.

---

## 4. Alterações Realizadas

| Arquivo | Alteração Executada |
| :--- | :--- |
| `apps/stremio-addon/package.json` | Versão atualizada de `1.0.0-rc.8` para `1.0.0`. |
| `apps/stremio-addon/src/addon/manifest.ts` | `manifest.version` atualizado de `1.0.0-rc.8` para `1.0.0`. |
| `apps/stremio-addon/src/discovery/opensubtitles-discovery-provider.ts` | `User-Agent` padrão atualizado de `SubtitleMe v1.0.0-rc.3` para `SubtitleMe v1.0.0`. |
| `apps/stremio-addon/src/sources/opensubtitles-source.ts` | `User-Agent` padrão atualizado de `SubtitleMe v0.2.0` para `SubtitleMe v1.0.0`. |
| `apps/stremio-addon/QUICKSTART.md` | Criado guia operacional standalone completo para inclusão no tarball GA. |
| `scripts/package-stremio-addon.mjs` | Atualizado para copiar `QUICKSTART.md` na raiz do pacote standalone e ajustar o cabeçalho do `.sha256` para GA. |
| `apps/stremio-addon/tests/subtitle-discovery.test.ts` | Assert de versão do manifesto atualizado para `1.0.0`. |
| `apps/stremio-addon/tests/sprint13-security-rc.test.ts` | Asserts de consistência de versão de `package.json` e `manifest.ts` atualizados para `1.0.0`. |
| `docs/GA_RELEASE_NOTES.md`, `docs/GA_RELEASE_CHECKLIST.md`, `docs/SPRINT_16_2_GA_RELEASE_REPORT.md` | Documentação finalizada para `v1.0.0 GA`. |

---

## 5. Auditoria de Metadados (Fase 1 & Fase 2)

- **Auditoria Inicial (Pré-Promoção):**
  - `apps/stremio-addon/package.json`: `1.0.0-rc.8`
  - `apps/stremio-addon/src/addon/manifest.ts`: `1.0.0-rc.8`
  - `apps/stremio-addon/src/discovery/opensubtitles-discovery-provider.ts`: `'SubtitleMe v1.0.0-rc.3'`
  - `apps/stremio-addon/src/sources/opensubtitles-source.ts`: `'SubtitleMe v0.2.0'`
  - `dist/release/subtitleme-stremio-v1.0.0-rc.8.tar.gz`: `SHA-256 = c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`
- **Auditoria Pós-Alinhamento (`1.0.0`):**
  - Varredura recursiva em `apps/stremio-addon/src` e no bundle compilado `dist/index.mjs`: **`0` ocorrências** de `1.0.0-rc.*` ou `v0.2.0`.
  - `SubtitleMe v1.0.0` confirmado no bundle `dist/index.mjs` empacotado.
  - Referências históricas de RCs preservadas intactas em changelogs e relatórios anteriores.

---

## 6. Documentação Adicionada

- **`apps/stremio-addon/QUICKSTART.md`** (empacotado na raiz de `subtitleme-stremio-v1.0.0.tar.gz`): cobre requisitos (`Node.js >= 22`), extração, inicialização no Windows via `.cmd` (recomendado), `.ps1` e `node`, notas honestas sobre `.sh` (Linux/macOS), instalação no Stremio Desktop, configuração de 37 idiomas e fontes no Companion Studio, seleção das faixas Dual e `Estilizar legendas ASS` vs `Branco SRT`, importação local de `.srt`/`.vtt` e `contentId` via API Companion, encerramento gracioso (`Ctrl+C`), limitações conhecidas e solução de problemas.

---

## 7. Estrutura do Pacote GA

Conteúdo da raiz de `subtitleme-stremio-v1.0.0.tar.gz` (`5.629` arquivos no total):

```text
subtitleme-stremio-v1.0.0.tar.gz
├── QUICKSTART.md
├── package.json              (version: "1.0.0", ZERO workspace:*)
├── package-lock.json
├── bin/
│   ├── start-companion.cmd
│   ├── start-companion.ps1
│   └── start-companion.sh
├── dist/
│   └── index.mjs             (266.87 kB SSR bundle)
└── node_modules/             (116 pacotes de produção; stremio-addon-sdk ^1.6.10)
```

---

## 8. Tamanho do Pacote

- **`subtitleme-stremio-v1.0.0.tar.gz`:** `2.476.194` bytes (`~2,36 MB`) · `5.629` arquivos.

---

## 9. SHA-256

- **`subtitleme-stremio-v1.0.0.tar.gz`:**  
  `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`
- **`subtitleme-stremio-v1.0.0-rc.8.tar.gz` (preservado intacto):**  
  `c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`

---

## 10. Resultado de Cada Teste (Regressão Completa vs Sprint 16)

| Gate | Comando Executado | Resultado Sprint 16 (`rc.8`) | Resultado Sprint 16.2 (`1.0.0`) |
| :--- | :--- | :--- | :--- |
| **TypeScript** | `corepack pnpm -r typecheck` | PASS (`8/8` pacotes) | **PASS (`8/8` pacotes)** |
| **ESLint** | `.\node_modules\.bin\eslint.cmd .` | PASS (`0` erros / `0` avisos) | **PASS (`0` erros / `0` avisos)** |
| **Build** | `corepack pnpm -r build` | PASS (`8/8` pacotes) | **PASS (`8/8` pacotes)** |
| **Vitest (Unit + Integração + Companion + Segurança)** | `.\node_modules\.bin\vitest.cmd run` | PASS (`34` arquivos · `134 passed \| 1 skipped`) | **PASS (`34` arquivos · `134 passed \| 1 skipped` em `8.54s`)** |
| **Chrome Extension E2E (Chromium Real)** | `CHROME_PATH=... node tests/e2e/chrome-extension.mjs` | PASS (`pageErrors=0`) | **PASS (`mount=27ms`, `srtImport=102ms`, `fiveVideos=227ms`, `pageErrors=0`)** |
| **Instalação Independente Fora do Monorepo** | Extração em `C:\` + `cmd /c bin\start-companion.cmd` | PASS (`rc.8`) | **PASS (`1.0.0` GA)** |

*(O único teste ignorado na suíte Vitest é o teste de subprocesso bash `start-companion.sh`, marcado via `it.skipIf(process.platform === 'win32')` por rodar em host Windows.)*

---

## 11. Resultado da Instalação Limpa (`C:\` Isolado do Monorepo)

O tarball `subtitleme-stremio-v1.0.0.tar.gz` foi extraído fora do monorepo (`C:\Users\Marcus\...\clean-ga-100-audit`), executado via `cmd.exe /c bin\start-companion.cmd` na porta `17910` e encerrado controladamente:

- **Integridade:** SHA-256 verificado, `QUICKSTART.md` e launchers presentes, `stremio-addon-sdk` carregado de `node_modules/` local, zero `workspace:*`, zero segredos, zero versões antigas.
- **Runtime:**
  - `GET /health` → `200 OK` (`localOnly: true`)
  - `GET /companion/health` → `200 OK` (`host: "127.0.0.1"`, `localOnly: true`)
  - `GET /manifest.json` → `200 OK` (`version: "1.0.0"`, `37` idiomas)
  - `GET /configure` → `200 OK` (token efêmero de `256` bits presente)
  - `POST /companion/subtitles` (SRT + VTT) → `201 Created`
  - Entrega `.VTT` clássico → `200 OK`
  - Entrega `.ASS` estilizado + Modo Reveal (`1000ms`) sob `pob` e `eng` → `200 OK`
  - Entrega `.SRT` limpo (sem `<font>`) → `200 OK`

---

## 12. Auditoria de Segurança (Validada no Pacote GA `1.0.0`)

- **Loopback exclusivo (`127.0.0.1`):** PASS
- **Token efêmero de 256 bits (`64` hex chars):** PASS
- **Validação de `Host` contra DNS rebinding (`Host: attacker.example`):** `403 Forbidden` (PASS)
- **Requisição não autenticada em `/companion/subtitles`:** `401 Unauthorized` (PASS)
- **Validação de `Origin` remoto (`OPTIONS` com `Origin: https://evil.example`):** `403 Forbidden`, sem `Access-Control-Allow-Origin` (PASS)
- **Separação CORS/PNA (`OPTIONS /manifest.json` com `Origin: https://web.stremio.com`):** `204` com `Access-Control-Allow-Private-Network: true` (PASS)
- **Proteção CSRF em rota mutável sem `X-SubtitleMe-CSRF: 1`:** `403 Forbidden` (PASS)
- **Proteção contra path traversal (`..\..\secret.srt`):** `400 Bad Request` (PASS)
- **Limites de upload/cache (`5 MB` / `20 MB` / `50 MB`), isolamento de sessão e ausência de segredos:** PASS (`0` segredos no repositório e no tarball).

---

## 13. Compatibilidade Validada e Validação Visual

- **Windows 11 X64 + Node.js `v24.19.0`:** ambiente validado ponta a ponta (build, testes, instalação limpa via `bin\start-companion.cmd`, runtime e segurança).
- **Stremio Desktop `5.0.28`:** Validação visual e funcional no Stremio Desktop 5.0.28 realizada e aprovada pelo usuário. Não foram solicitadas ou arquivadas novas capturas de tela nesta sprint.
- **Extensão Chrome SubtitleMe (`apps/chrome-extension`):** validada em Chromium real (`tests/e2e/chrome-extension.mjs`, `pageErrors=0`), sem alterações.
- **Linux (`bin/start-companion.sh`):** validado em host Linux até `1.0.0-rc.1`; não reexecutado na `v1.0.0` em host Linux.
- **macOS:** não testado nesta release.
- **Android, Android TV, Smart TVs e iOS:** **não suportados** devido à arquitetura local exclusiva em `127.0.0.1`.

---

## 14. Limitações Conhecidas

1. Servidor restrito exclusivamente a `127.0.0.1` (não acessível pela LAN nem por TVs/celulares externos).
2. Persistência em disco (`SUBTITLEME_PERSISTENCE=1`) é opt-in e armazena configurações/chaves localmente sem criptografia em repouso (`encryptedAtRest: false`).
3. Para renderizar cores e escala `.ASS` no Stremio Desktop, o usuário deve manter ativa a opção **Configurações › Reprodutor › Estilizar legendas ASS**.
4. O script `tests/e2e/chrome-extension.mjs` exige a variável `CHROME_PATH` no Windows 11.

---

## 15. Confirmação de Preservação dos RCs

Todos os Release Candidates anteriores (`subtitleme-stremio-v1.0.0-rc.1.tar.gz` até `subtitleme-stremio-v1.0.0-rc.8.tar.gz` e respectivos `.sha256`) permanecem preservados e inalterados em `dist/release/`, com `rc.8` revalidado em `c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`.

---

## 16. Confirmação de Não Publicação e Não Push

- **Nenhum `git commit`** foi criado sem autorização explícita.
- **Nenhum `git push`** foi executado.
- **Nenhuma publicação** em lojas, diretórios Stremio ou serviços externos foi realizada.
