# SubtitleMe — Stremio Visual Test Matrix (`1.0.0-rc.3`, Sprint 15.5)

| ID | Cenário | Critério de Aprovação | Resultado Observado | Status |
| :--- | :--- | :--- | :--- | :--- |
| 01 | Integridade do RC | Hash correto | `c1ab3cc45a6911226ab126bd04abeab137d9dbad06ebd0fcb3e61f53e896290d` idêntico | **PASS** |
| 02 | Companion no Windows | Inicialização funcional | Iniciado via `bin\start-companion.cmd` em `127.0.0.1:7000` (PID `12512`) | **PASS** |
| 03 | Manifest | Reconhecido pelo Stremio | Addon instalado no Stremio Desktop `5.0.28` | **PASS** |
| 04 | Configuração | Interface acessível | `GET /configure` `200 OK` | **PASS** |
| 05 | Upload SRT | Arquivo importado | `movie-pt-BR.srt` e `episode-pt-BR.srt` → `201 Created` | **PASS** |
| 06 | Upload VTT | Arquivo importado | `movie-en.vtt` e `episode-en.vtt` → `201 Created` | **PASS** |
| 07 | Content ID | Associação correta | `tt1254207`, `tt0903747:1:1` e `sm_test_001` validados via HTTP | **PASS** |
| 08 | Discovery | Duas fontes encontradas | `LocalDiscoveryProvider` encontrou ambos os idiomas | **PASS** |
| 09 | Matching | Dois idiomas aprovados | `pt-BR` + `en` aprovados pelo matcher | **PASS** |
| 10 | Merge | VTT bilíngue gerado | `/generated/<token>.vtt` `200 OK` com duas línguas e acentos | **PASS** |
| 11 | Subtitle picker | Legenda disponível | Não apareceu no player do Stremio `5.0.28` (bloqueio PNA/CORS + `idPrefixes` ausente) | **FAIL** |
| 12 | Dual rendering | Duas línguas visíveis | Não atingido no player real | **FAIL** |
| 13 | Ordem e posicionamento | Configuração respeitada | Bloqueado pelo Cenário 11 | **BLOCKED** |
| 14 | Offset | Ajustes independentes respeitados | Bloqueado pelo Cenário 11 | **BLOCKED** |
| 15 | Reprodução e estabilidade | Pause, resume, seek e 10 min | Bloqueado pelo Cenário 11 | **BLOCKED** |
