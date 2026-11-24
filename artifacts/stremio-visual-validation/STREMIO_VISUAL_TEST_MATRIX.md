# SubtitleMe — Stremio Visual Test Matrix (Sprint 15.3)

**Release Candidate**: `1.0.0-rc.2` (`6e52ba59a7134901ac5b86669eec8c08310aaddd417b6efcbc5aa11465c6a71a`)  
**Stremio Desktop**: `5.0.28` | **OS**: Windows 11 X64 | **Node.js**: `v24.19.0`

| ID | Cenário | Resultado Esperado | Resultado Observado | Status | Evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 01 | Instalação do addon | Addon reconhecido | Usuário confirmou que o addon foi adicionado no Stremio Desktop `5.0.28` | **PASS** | Relato real do usuário; sem screenshot |
| 02 | Abertura da configuração | Configuração carregada | `GET /configure` `200 OK` (HTTP); não capturado visualmente | **BLOCKED** | HTTP verificado; sem screenshot |
| 03 | Companion conectado | Comunicação funcional | Companion ativo em `127.0.0.1:7000` (PID `25416`), `netstat` loopback-only | **PASS** | Logs de execução + `netstat` |
| 04 | Importação de SRT | Arquivo reconhecido | `POST /companion/subtitles` (`bbb-primary-pt-BR.srt`) → `201` (API) | **BLOCKED** | API OK; validação visual encerrada |
| 05 | Importação de VTT | Arquivo reconhecido | `POST /companion/subtitles` (`bbb-secondary-en.vtt`) → `201` (API) | **BLOCKED** | API OK; validação visual encerrada |
| 06 | Associação por contentId | Conteúdo correto | Durante o teste no Stremio, store estava com `0` legendas / conteúdo sem par carregado | **FAIL** | `GET /companion/health` → `registeredSubtitles: 0` |
| 07 | Geração bilíngue | Duas línguas no VTT | `GET /<config>/subtitles/movie/tt1254207.json` retornou `{"subtitles":[]}` no momento do diagnóstico | **FAIL** | Resposta HTTP real durante diagnóstico |
| 08 | Seleção da legenda no player | Legenda disponível | Nenhuma legenda ou opção do SubtitleMe apareceu no player do Stremio Desktop `5.0.28` | **FAIL** | Relato real do usuário no Stremio `5.0.28` |
| 09 | Reprodução simultânea | Duas línguas visíveis | Não atingido — nenhuma legenda disponível no player | **BLOCKED** | Bloqueado pelo Cenário 08 |
| 10 | Posicionamento | Ordem e posição corretas | Não atingido | **BLOCKED** | Bloqueado pelo Cenário 08 |
| 11 | Offset independente | Ajustes respeitados | Não atingido | **BLOCKED** | Bloqueado pelo Cenário 08 |
| 12 | Pausa e retomada | Sincronização preservada | Não atingido | **BLOCKED** | Bloqueado pelo Cenário 08 |
| 13 | Busca na timeline | Legendas acompanham o tempo | Não atingido | **BLOCKED** | Bloqueado pelo Cenário 08 |
| 14 | Conteúdo sem uma das fontes | Não apresentar falso resultado bilíngue | Não validado visualmente no player | **BLOCKED** | Validação encerrada como `REJECTED` |
| 15 | Exclusão e atualização | Legenda derivada invalidada e atualizada | Não validado visualmente no player | **BLOCKED** | Validação encerrada como `REJECTED` |
