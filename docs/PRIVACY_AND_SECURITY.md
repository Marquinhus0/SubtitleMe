# Privacidade e Segurança — SubtitleMe (`v1.0.0`)

O SubtitleMe foi projetado sob o princípio **local-first**: não exige conta, não coleta telemetria e executa o processamento e a combinação de legendas localmente no seu computador.

---

## 1. Arquitetura local e comunicação com o Stremio

- **Binding exclusivo em loopback (`127.0.0.1`):** a função `assertLoopbackHost()` recusa explicitamente `0.0.0.0`, `::` e qualquer endereço de rede local (LAN). O Companion nunca fica acessível a outros dispositivos da rede.
- **Comunicação com Stremio:** o Stremio Desktop na mesma máquina consulta `http://127.0.0.1:7000/manifest.json`, `GET /subtitles/:type/:id.json` e baixa a faixa combinada em `GET /generated/:token.(ass|srt|vtt)`.
- **Isolamento estrito de CORS e PNA:**
  - Cabeçalhos permissivos (`Access-Control-Allow-Origin: *` e `Access-Control-Allow-Private-Network: true`) são aplicados **somente** às rotas de protocolo do Stremio (`/manifest.json`, `/subtitles/*`, `/generated/*`, `/health`).
  - As rotas administrativas do Companion (`/companion/*`) **nunca** emitem `Access-Control-Allow-Origin: *` nem `Access-Control-Allow-Private-Network`.

---

## 2. Autenticação de sessão, CSRF, Host e Origin

Todas as operações administrativas do Companion (`/companion/*`) e a página `/configure` aplicam múltiplas camadas de proteção:

- **Token efêmero de sessão de `256` bits:** gerado na inicialização via `randomBytes(32)`, verificado em tempo constante (`timingSafeEqual()`), com validade limitada (**TTL de `12 horas`**) e revogação imediata via `POST /companion/session/revoke`. O token é injetado em memória na página `/configure` (mesma origem) e nunca salvo em cookies ou `localStorage`.
- **Proteção CSRF:** todas as requisições que alteram estado (`POST`, `DELETE`) exigem o cabeçalho customizado `X-SubtitleMe-CSRF: 1` além do token válido (`X-SubtitleMe-Token`).
- **Proteção contra DNS Rebinding (`Host`):** todas as rotas `/`, `/configure` e `/companion/*` (incluindo `/companion/health` e `OPTIONS`) rejeitam com `403` qualquer requisição cujo header `Host` não seja exatamente `127.0.0.1:<porta>` ou `localhost:<porta>`.
- **Validação de `Origin`:** origens externas (ex.: `https://site-externo.example`) são bloqueadas com `403` nas rotas `/companion/*`.

---

## 3. Armazenamento local, persistência opcional e limites

- **Modo padrão (somente memória):** por padrão (`enabled: false`), legendas enviadas localmente e faixas geradas existem apenas na memória RAM e desaparecem ao encerrar o Companion.
- **Persistência local opcional (`SUBTITLEME_PERSISTENCE=1` ou consentimento em `/configure`):**
  - Grava dados exclusivamente no diretório privado do perfil do usuário (`~/.subtitleme/stremio-companion` no Linux; `%USERPROFILE%\.subtitleme\stremio-companion` no Windows).
  - Usa nomes internos aleatórios (UUID) — nomes enviados pelo cliente são mantidos apenas como metadado e **nunca** usados como caminho no disco.
  - Escrita atômica (`.tmp.*` + `renameSync`), limpeza automática de temporários órfãos no boot, proteção contra path traversal (`assertPathInsideDir`) e bloqueio de symlinks (`O_NOFOLLOW`/`O_EXCL` em POSIX; fallback `lstatSync` no Windows).
- **Limites de proteção (Anti-DoS):**
  - Upload de legenda local: máximo **`5 MB`** por arquivo (`HTTP 413`).
  - Cache em memória de legendas combinadas (`/generated/*`): tokens opacos aleatórios de **`192` bits**, máximo **`200` entradas**, teto de **`20 MB`**, **TTL de `15 minutos`**, evicção **LRU**, isolamento por `sessionScope`, `Cache-Control: private, no-store` e invalidação imediata ao excluir uma fonte.
  - Cota padrão de persistência em disco: **`50 MB`**.

---

## 4. Funcionalidades locais vs. serviços externos opcionais

| Recurso | Local ou Externo? | Dados transmitidos para fora do PC |
| :--- | :--- | :--- |
| **Upload local (`.srt` / `.vtt`), parsing, merge, sync e renderização** | **100% Local** | **Nenhum.** Arquivos locais do usuário nunca são enviados a serviços externos. |
| **OpenSubtitles v3 (`opensubtitles-v3.strem.io`)** | Externo (ativo por padrão, desativável em `/configure`) | Consulta HTTP pública com ID do título (ex.: IMDb ID) e idioma solicitado. Sem chave de API. |
| **Subtitle Sync (`subtitlesync.stream`)** | Externo (opt-in — desabilitado por padrão) | Consulta ao manifesto/URL configurada pelo usuário com ID do título e metadados do Stremio. |
| **OpenSubtitles REST API v1 (`api.opensubtitles.com/api/v1`)** | Externo (opt-in — desabilitado por padrão) | Envia `Api-Key` do usuário no header HTTP + ID IMDb, idioma e `moviehash` (quando disponível). |

- **Ausência de scraping:** o SubtitleMe utiliza apenas protocolos/APIs oficiais e não faz scraping de páginas web.
- **Tratamento de credenciais:** chaves da OpenSubtitles v1 e URLs do Subtitle Sync **nunca** são gravadas em logs nem ecoadas de volta nas respostas HTTP (`/companion/opensubtitles` retorna apenas flags booleanas `hasApiKey` / `hasUrl`).

---

## 5. Limitações de proteção em repouso (transparência)

- **Não há criptografia em repouso (`encryptedAtRest: false`):** quando você ativa voluntariamente `SUBTITLEME_PERSISTENCE=1`, os arquivos `settings.json`, `providers.json` (incluindo eventual API Key da OpenSubtitles v1 ou URL do Subtitle Sync) e legendas locais ficam gravados em texto claro no diretório privado do seu usuário no sistema operacional (permissões `0o700`/`0o600` em POSIX; ACL do usuário no Windows).
- Qualquer processo em execução sob a **mesma conta de usuário do sistema operacional** pode ler arquivos do perfil local ou acessar `127.0.0.1:7000`.
- Para detalhes completos da auditoria técnica dos 15 controles de segurança, consulte [docs/GA_SECURITY_AUDIT.md](./GA_SECURITY_AUDIT.md).
