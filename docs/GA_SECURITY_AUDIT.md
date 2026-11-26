# SubtitleMe Stremio Addon — Final Security & Privacy Audit (`1.0.0-rc.8` → GA)

**Data:** 2026-11-26  
**Versão Auditada:** `1.0.0-rc.8` (`SHA-256: c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`)  
**Status do Gate de Segurança:** **APPROVED (`PASS` — 15 / 15 categorias auditadas sem bloqueadores)**

---

## 1. Escopo e Modelo de Ameaças

O componente `@subtitleme/stremio-addon` opera um servidor HTTP local (`Local Companion` + roteador `stremio-addon-sdk`) na máquina do usuário. Os vetores auditados foram:
1. Exposição indevida na rede local (LAN / `0.0.0.0` / IPv6 curinga `::`).
2. Ataques de **DNS Rebinding** contra `127.0.0.1:7000`.
3. **Cross-Site Request Forgery (CSRF)** e abuso de CORS/Private Network Access (PNA) a partir de páginas web externas.
4. **Path Traversal**, escrita fora do diretório de dados e corridas de symlink (**TOCTOU**).
5. Injeção de HTML/scripts ou upload de binários/arquivos gigantes (DoS de memória/disco).
6. Vazamento entre sessões no cache de legendas geradas (`/generated/:token.(vtt|srt|ass)`).
7. Vazamento de credenciais (`OpenSubtitles API v1`, `Subtitle Sync URL`, tokens de sessão) em respostas HTTP, logs ou Git.

---

## 2. Matriz de Auditoria dos 15 Controles Obrigatórios (Fase 4)

| # | Controle | Evidência em Código | Evidência de Teste / Execução | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Binding exclusivo em `127.0.0.1`** | `assertLoopbackHost()` (`companion-config.ts`) rejeita `0.0.0.0`, `::` e IPs de rede local antes de `server.listen(port, '127.0.0.1')`. | `companion.test.ts` (rejeita `0.0.0.0`, `192.168.1.10`, `::`); subprocesso standalone confirmado em `127.0.0.1`. | **PASS** |
| 2 | **Token efêmero de 256 bits** | `randomBytes(32).toString('hex')` (`companion-auth.ts`), comparado em tempo constante via `timingSafeEqual()`, TTL de `12h` e rotação imediata em `POST /companion/session/revoke`. | `security-audit.test.ts`, `release-readiness.test.ts`, `sprint13-security-rc.test.ts` + verificação standalone (`64` hex chars = `256` bits). | **PASS** |
| 3 | **Proteção CSRF** | Todas as rotas mutáveis (`POST`, `DELETE` em `/companion/*`) exigem `X-SubtitleMe-CSRF: 1` além do token de sessão válido. | `companion.test.ts`, `security-audit.test.ts`, `sprint13-security-rc.test.ts` (`403` sem CSRF). | **PASS** |
| 4 | **Validação de `Host` (DNS Rebinding)** | `CompanionAuth.validateHostHeader()` exige `127.0.0.1:<port>` ou `localhost:<port>` em `/`, `/configure` e em **todas** as rotas `/companion/*` (incluindo `/companion/health` e `OPTIONS`). | `security-audit.test.ts`, `sprint13-security-rc.test.ts`, auditoria standalone (`Host: evil.com` → `403`). | **PASS** |
| 5 | **Validação de `Origin`** | `CompanionAuth.isAllowedOrigin()` bloqueia qualquer `Origin` remoto (`https://attacker.example`, `https://web.stremio.com`, etc.) nas rotas administrativas `/companion/*` com `403`. | `companion.test.ts`, `stremio5-pna-and-dualsubs.test.ts` (`403`). | **PASS** |
| 6 | **Isolamento estrito de CORS & PNA** | `applyCorsHeaders()` (`Access-Control-Allow-Origin: *` + `Access-Control-Allow-Private-Network: true`) aplica-se **somente** às rotas públicas do protocolo Stremio (`/manifest.json`, `/subtitles/*`, `/generated/*`, `/health`). `/companion/*` **jamais** emite `*` nem `Allow-Private-Network`. | `security-audit.test.ts`, `stremio5-pna-and-dualsubs.test.ts`. | **PASS** |
| 7 | **Defesa contra Path Traversal & Symlinks** | `validateContentId()`, `validateSubtitleFilename()`, `assertPathInsideDir()`, `assertNotSymlink()`, `readFileNoFollow()` (`O_NOFOLLOW`) e nomes internos `randomUUID()`. | `companion.test.ts`, `release-readiness.test.ts`, `sprint13-security-rc.test.ts`. | **PASS** |
| 8 | **Validação rigorosa de uploads** | Rejeita campos proibidos (`url`, `filePath`, `apiKey`, `token`), bytes nulos/binários (`\0`), tags `<script>`/`<html>`/`<iframe>`, extensões falsificadas (exige header `WEBVTT` real ou blocos de tempo SRT válidos) e `0` cues. | `companion.test.ts` (`400 Bad Request` em todos os payloads forjados). | **PASS** |
| 9 | **Limites de tamanho (Anti-DoS)** | `5 MB` por arquivo de legenda (`413`), `7 MB` para JSON de upload, `8 KB–64 KB` para JSONs administrativos, `20 MB` / `200` entradas no cache em memória, `50 MB` de cota padrão em disco. | `companion.test.ts`, `persistence.test.ts`, `cache-security.test.ts`. | **PASS** |
| 10 | **Segurança do Cache (`/generated/*`)** | Tokens opacos aleatórios de `192` bits (`randomBytes(24)`), regex estrita `/^[a-f0-9]{32,64}$/`, TTL `15 min`, LRU eviction, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` e invalidação imediata ao excluir fonte. | `cache-security.test.ts`, `companion.test.ts`, `subtitle-discovery.test.ts`. | **PASS** |
| 11 | **Segurança da Persistência** | Opt-in (`enabled: false` por padrão), escrita atômica (`O_CREAT | O_EXCL | O_NOFOLLOW` + `renameSync`), limpeza automática de órfãos `.tmp.*` no boot e descarte seguro de entradas corrompidas. | `persistence.test.ts`, `release-readiness.test.ts`, `sprint13-security-rc.test.ts`. | **PASS** |
| 12 | **Isolamento de Sessão** | `GeneratedSubtitleCache` indexa entradas por `${sessionScope}::${fingerprint}`; busca com `sessionScope` divergente retorna `null`. | `subtitle-discovery.test.ts` (Cenário 19: `session-alpha` vs `session-beta`). | **PASS** |
| 13 | **Proteção de Segredos e API Keys** | `GET /companion/opensubtitles` e `POST /companion/opensubtitles` retornam apenas flags booleanas (`hasApiKey`, `hasUrl`, `enabled`), jamais ecoando a chave OpenSubtitles v1 ou a URL tokenizada do Subtitle Sync. `RuntimeSettingsStore` possui whitelist `ALLOWED_KEYS` sem campos de segredo. | `stremio5-pna-and-dualsubs.test.ts` (verifica ausência de segredos no corpo da resposta). | **PASS** |
| 14 | **Higiene de Logs** | Logs de console registram apenas `PORT`, `PID`, estado booleano das fontes e `type`/`id`/`returnedCount` das consultas do Stremio — zero headers `Api-Key`, `Authorization` ou URLs privadas. | Inspeção de `index.ts`, `opensubtitles-discovery-provider.ts` e `subtitle-sync-provider.ts`. | **PASS** |
| 15 | **Ausência de Credenciais e URLs Pessoais no Git e no Tarball** | Varredura automatizada sobre todos os `277` arquivos rastreados (`git ls-files`) e todos os arquivos do pacote standalone `1.0.0-rc.8`. | `SECRET_HITS_COUNT: 0` no repositório e `SECRET_SCAN_HITS: 0` no tarball standalone. | **PASS** |

---

## 3. Riscos Residuais Documentados Honestamente

1. **Sem criptografia em repouso (`encryptedAtRest: false`)**: Quando o usuário ativa voluntariamente `SUBTITLEME_PERSISTENCE=1`, legendas locais, `settings.json` e `providers.json` (incluindo API Key opcional da OpenSubtitles v1 / URL do Subtitle Sync) são gravados em texto claro no diretório privado do perfil do usuário (`~/.subtitleme/stremio-companion`, permissões `0o700` / `0o600` em sistemas POSIX; ACL do usuário no Windows). Processos executando sob a mesma conta de usuário do sistema operacional possuem acesso local a esses arquivos.
2. **Diferença de `O_NOFOLLOW` no Windows**: No Windows, `fs.constants.O_NOFOLLOW` não existe no kernel Win32 (assume `0`), recaindo na verificação prévia `lstatSync` + `assertPathInsideDir`.
3. **Confiança de máquina local**: Por arquitetura de addon local sem login na nuvem, qualquer cliente HTTP local na mesma máquina capaz de ler `/configure` em `127.0.0.1` (sob `Host` válido) obtém o token da sessão local vigente.
