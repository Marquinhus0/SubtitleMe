# SUBTITLEME — SPRINT 17.1 GIT RELEASE PREPARATION (`v1.0.0`)

**Data:** 2026-11-26  
**Release Alvo:** SubtitleMe Stremio Addon `v1.0.0`  
**Status da Sprint 17.1:** Preparação concluída — **aguardando autorização explícita do usuário para executar `git add`, `git commit`, `git tag` e (se desejado) `git push`**.

---

## 1. Estado Inicial e Final do Repositório

| Item | Estado Inicial (Antes da Sprint 17.1) | Estado Final (Após Sprint 17.1) |
| :--- | :--- | :--- |
| **Branch** | `main` | `main` |
| **HEAD** | `1c6e866dc10ee2bbb335adecb3b8351cb7eb8199` | `1c6e866dc10ee2bbb335adecb3b8351cb7eb8199` |
| **Tracking Ref (`origin/main`)** | `1c6e866dc10ee2bbb335adecb3b8351cb7eb8199` | `1c6e866dc10ee2bbb335adecb3b8351cb7eb8199` |
| **Tags Existentes** | Nenhuma (`0` tags) | Nenhuma (`0` tags — `v1.0.0` ainda não criada) |
| **Stage (`git diff --cached`)** | Vazio | Vazio (`git add` não executado) |
| **Alterações Funcionais de Código** | Nenhuma nesta sprint | Nenhuma nesta sprint (somente documentação/changelog preparados) |

---

## 2. Branch, HEAD e Remote Identificado

- **Branch local:** `main`
- **Commit HEAD:** `1c6e866dc10ee2bbb335adecb3b8351cb7eb8199` (`fix(stremio-addon): constrain configure CSS grid tracks for long manifest URLs & finalize rc.8 report`)
- **Remote configurado (`origin`):**
  - `fetch`: `https://github.com/Marquinhus0/SubtitleMe.git`
  - `push`: `https://github.com/Marquinhus0/SubtitleMe.git`
- **Situação local vs `origin/main`:** sincronizados em `1c6e866dc10ee2bbb335adecb3b8351cb7eb8199` (`0` commits ahead, `0` commits behind).

---

## 3. Integridade do Pacote GA e Preservação dos RCs

- **Pacote Oficial GA:** `dist/release/subtitleme-stremio-v1.0.0.tar.gz` (`2.476.194` bytes · `5.629` arquivos)
  - **SHA-256:** `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`
  - **Checksum file:** `dist/release/subtitleme-stremio-v1.0.0.sha256`
- **Preservação dos RCs (`rc.1` a `rc.8`):** todos os 8 RCs anteriores permanecem intactos em `dist/release/`, com `subtitleme-stremio-v1.0.0-rc.8.tar.gz` reconfirmado em:
  - **SHA-256 (`rc.8`):** `c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`
- **Auditoria de Segredos e Arquivos Temporários:** `0` segredos/credenciais e `0` arquivos temporários (`.tmp`, `.bak`, `.log`, `.map`, `.env`) nos arquivos modificados e não rastreados.

---

## 4. Proposta de Commit e Lista Completa de Arquivos

### Mensagem de Commit Proposta
```text
release(stremio): prepare v1.0.0
```

### Arquivos a Incluir no Commit (`17` arquivos)

| # | Status Git | Arquivo | Justificativa |
| :--- | :--- | :--- | :--- |
| 1 | `M` | `apps/stremio-addon/package.json` | Promove versão do pacote `@subtitleme/stremio-addon` de `1.0.0-rc.8` para `1.0.0`. |
| 2 | `M` | `apps/stremio-addon/src/addon/manifest.ts` | Alinha `manifest.version` do Stremio para `1.0.0`. |
| 3 | `M` | `apps/stremio-addon/src/discovery/opensubtitles-discovery-provider.ts` | Atualiza `User-Agent` padrão de `SubtitleMe v1.0.0-rc.3` para `SubtitleMe v1.0.0`. |
| 4 | `M` | `apps/stremio-addon/src/sources/opensubtitles-source.ts` | Atualiza `User-Agent` padrão de `SubtitleMe v0.2.0` para `SubtitleMe v1.0.0`. |
| 5 | `M` | `apps/stremio-addon/tests/sprint13-security-rc.test.ts` | Atualiza asserts de consistência de versão (`package.json` e `manifest.ts`) para `1.0.0`. |
| 6 | `M` | `apps/stremio-addon/tests/subtitle-discovery.test.ts` | Atualiza assert de versão do manifesto retornado por `/manifest.json` para `1.0.0`. |
| 7 | `M` | `scripts/package-stremio-addon.mjs` | Inclui `QUICKSTART.md` na raiz do tarball standalone e ajusta cabeçalho do `.sha256` para release GA. |
| 8 | `M` | `docs/CHANGELOG.md` | Registra formalmente a entrada `[1.0.0] — 2026-11-26` preservando todo o histórico anterior. |
| 9 | `??` | `apps/stremio-addon/QUICKSTART.md` | Guia operacional standalone distribuído dentro do pacote `v1.0.0`. |
| 10 | `??` | `docs/GA_READINESS_REPORT.md` | Relatório formal de auditoria da Sprint 16 (`1.0.0-rc.8`). |
| 11 | `??` | `docs/GA_SECURITY_AUDIT.md` | Matriz de auditoria dos 15 controles de segurança e riscos residuais. |
| 12 | `??` | `docs/GA_COMPATIBILITY_MATRIX.md` | Matriz honesta de compatibilidade por OS, Stremio, navegadores e formatos. |
| 13 | `??` | `docs/GA_FUNCTIONAL_VALIDATION.md` | Auditoria detalhada dos 16 critérios funcionais e regressão completa. |
| 14 | `??` | `docs/GA_RELEASE_CHECKLIST.md` | Checklist consolidado de aprovação GA `v1.0.0`. |
| 15 | `??` | `docs/GA_RELEASE_NOTES.md` | Notas oficiais de release da `v1.0.0 GA` com hashes SHA-256. |
| 16 | `??` | `docs/SPRINT_16_2_GA_RELEASE_REPORT.md` | Relatório final de promoção técnica `GO` da Sprint 16.2 (`v1.0.0`). |
| 17 | `??` | `docs/SPRINT_17_1_RELEASE_PREPARATION.md` | Relatório de preparação Git da release `v1.0.0` (este documento). |

*(Observação: `dist/release/subtitleme-stremio-v1.0.0.tar.gz` e `dist/release/subtitleme-stremio-v1.0.0.sha256` ficam corretamente ignorados por `.gitignore` (`dist/`), não poluindo o histórico Git com binários.)*

---

## 5. Changelog Preparado (`docs/CHANGELOG.md`)

Foi adicionada a seção `## [1.0.0] — 2026-11-26` em `docs/CHANGELOG.md`, documentando sem extrapolações:
- Motor multi-fonte (**Subtitle Sync**, **OpenSubtitles v3**, **OpenSubtitles REST API v1** opt-in e store local).
- Suporte a **37 idiomas** com códigos BCP-47, ISO 639-2 e aliases Stremio.
- **1 a 5 pares bilíngues** ranqueados por `%` de sobreposição nos dois idiomas do menu + roteamento por idioma (`Auto`/`Sync`/`OpenSub`).
- **Sincronização bidirecional**, regressão linear de drift FPS, proteção **anti-flicker (`380ms`)** e offsets independentes (`±30.000ms`).
- **Modo Reveal (`0s`–`2s`)** com reserva de altura `\u00A0` sem pulo vertical.
- Geração **VTT**, **ASS estilizado** e **SRT limpo**.
- **Companion local (`SubtitleMe Studio`)** com aplicação ao vivo, upload autenticado de `.srt`/`.vtt` e persistência opt-in.
- Controles de **segurança e privacidade** (`127.0.0.1`, token 256-bit, CSRF, anti-DNS rebinding, Origin/CORS/PNA, anti-traversal, limites de tamanho).
- **Requisitos e limitações conhecidas** (Windows 11 + Node.js 24 + Stremio Desktop `5.0.28`; Android/TV/iOS não suportados; Linux até `rc.1` e macOS não testado).

---

## 6. Proposta de Tag Anotada (Não Criada)

- **Nome da Tag:** `v1.0.0`
- **Mensagem:** `SubtitleMe Stremio Addon v1.0.0`
- **Comando preparado (aguardando autorização):**
  ```powershell
  git tag -a v1.0.0 -m "SubtitleMe Stremio Addon v1.0.0"
  ```

---

## 7. Riscos ou Divergências Encontrados

- **Nenhuma divergência crítica:** branch (`main`), `HEAD` (`1c6e866`), pacote GA (`7f298f2b...`) e RC-8 (`c1411b7f...`) conferem integralmente.
- **Observação de localização do Changelog:** o repositório utiliza `docs/CHANGELOG.md` (não há `CHANGELOG.md` na raiz), padrão preservado para manter consistência com as Sprints 01–16.
- **Observação de distribuição do tarball:** como `dist/` é ignorado pelo `.gitignore`, o artefato `dist/release/subtitleme-stremio-v1.0.0.tar.gz` e seu `.sha256` deverão ser anexados manualmente em um GitHub Release (caso o usuário autorize publicação em uma sprint futura), e não versionados diretamente no commit Git.

---

## 8. Confirmação de Segurança Operacional

- **Nenhum `git add`** foi executado.
- **Nenhum `git commit`** foi executado.
- **Nenhuma `git tag`** foi criada.
- **Nenhum `git push`** foi executado.
- **Nenhuma alteração de remote ou publicação externa** foi realizada.
