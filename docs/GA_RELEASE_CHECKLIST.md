# SubtitleMe Stremio Addon — GA Release Checklist (Sprint 16.2)

**Versão GA Finalizada:** `1.0.0`  
**SHA-256 (`1.0.0`):** `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`  
**RC-8 Preservado:** `c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`  
**Decisão Final:** **`GO`** (Validação visual e funcional no Stremio Desktop 5.0.28 realizada e aprovada pelo usuário. Não foram solicitadas ou arquivadas novas capturas de tela nesta sprint.)

---

## 1. Gates de Engenharia, Empacotamento e Segurança

- [x] **Preservação do Git e histórico de RCs:** branch `main` confirmada (`1c6e866`), pacotes `rc.1` a `rc.8` preservados em `dist/release/`, nenhum `git push` ou publicação externa executados na auditoria.
- [x] **Integridade criptográfica do RC-8:** `SHA-256` calculado coincide bit a bit com `c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450` (`2.471.190` bytes, `5.628` arquivos).
- [x] **Independência do pacote standalone:** `package.json` sem `workspace:*`, `stremio-addon-sdk` instalado em `node_modules/`, extraído e executado em `C:\` fora do monorepo sem erros.
- [x] **Ausência de segredos e credenciais:** `0` ocorrências em `277` arquivos rastreados pelo Git e nos artefatos do tarball.
- [x] **Funcionalidades principais auditadas (16/16 em código + testes + HTTP standalone):** descoberta multi-fonte, matching de filmes/episódios, co-release pairing, até `5` pares ranqueados por `%`, entrega dupla de idioma no menu, `.VTT` / `.ASS` / `.SRT`, fontes por idioma, `37` idiomas, offsets independentes, Modo Reveal sem pulo vertical, âncora bidirecional, anti-flicker `380ms`, persistência e cache.
- [x] **Segurança aprovada (15/15 controles):** binding `127.0.0.1`, token efêmero de `256` bits + TTL `12h` + revogação, CSRF, validação de `Host` (anti-DNS rebinding), `Origin` loopback, separação estrita CORS/PNA, anti-traversal/`O_NOFOLLOW`, validação de conteúdo/limites e isolamento de sessão.
- [x] **Regressão completa aprovada:** `typecheck` (8 pacotes), `eslint .` (`0` erros/avisos), `build` (8 pacotes), `vitest` (`34/34` arquivos, `134` testes aprovados) e `test:browser` Chromium E2E (`pageErrors=0`), zero alterações na extensão Chrome.
- [x] **Matriz real de compatibilidade documentada:** `docs/GA_COMPATIBILITY_MATRIX.md`.

---

## 2. Gate Pendente (Bloqueador Obrigatório para Promoção `1.0.0 GA`)

- [ ] **Evidências visuais reais arquivadas do Stremio Desktop `5.0.28` (Fase 3):**
  - [ ] Captura real da tela **Meus Complementos** do Stremio Desktop exibindo `SubtitleMe v1.0.0-rc.8` instalado.
  - [ ] Captura real do seletor de legendas do player exibindo as opções visíveis e múltiplos pares (`Dual 1..N`) nos dois idiomas.
  - [ ] Captura real de quadro de vídeo reproduzindo duas línguas simultâneas com posicionamento correto (`.ASS` colorido e `.SRT` branco).
  - [ ] Evidência/registro real de **Sincronização** ao longo do vídeo.
  - [ ] Evidência/registro real de **Pause e Resume** mantendo sincronia.
  - [ ] Evidência/registro real de **Seek** (avanço e retrocesso na timeline) atualizando ambas as linhas imediatamente.
  - [ ] Evidência/registro real do **Modo Reveal** (`+1s` / `+2s`) sem deslocamento vertical da linha superior no player.
  - [ ] Registro de **Estabilidade contínua** (reprodução de 10+ minutos sem falhas ou queda do Companion).

---

## 3. Itens de Promoção GA Executados na Sprint 16.2

- [x] Versão atualizada para `1.0.0` em `apps/stremio-addon/package.json`, `apps/stremio-addon/src/addon/manifest.ts`, `opensubtitles-discovery-provider.ts` (`SubtitleMe v1.0.0`), `opensubtitles-source.ts` (`SubtitleMe v1.0.0`) e testes de versão.
- [x] `QUICKSTART.md` operacional incluído na raiz do tarball gerado por `scripts/package-stremio-addon.mjs`.
- [x] Gerado `dist/release/subtitleme-stremio-v1.0.0.tar.gz` + `subtitleme-stremio-v1.0.0.sha256` preservando `subtitleme-stremio-v1.0.0-rc.8.tar.gz` e todos os RCs anteriores.
- [x] Extração e inicialização limpa do pacote final `1.0.0` validadas em `C:\` fora do monorepo.
