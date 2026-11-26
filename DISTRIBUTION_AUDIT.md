# SubtitleMe — Auditoria de Distribuição (`v1.0.0` · Sprint 17.2)

**Data:** 2026-11-26  
**Repositório:** `https://github.com/Marquinhus0/SubtitleMe`  
**Branch:** `main`  
**Commit verificado (`HEAD`):** `b546fc7a1590650246c3e5add923965275045d21`  
**Tag remota verificada (`origin`):** `v1.0.0` (`f2dc2aa57ff3f1ee6df49ac04bfe62f94abb9f3f` → `b546fc7a1590650246c3e5add923965275045d21`)  
**Pacote GA de referência:** `subtitleme-stremio-v1.0.0.tar.gz` (`2.476.194` bytes · `5.629` arquivos)  
**SHA-256 esperado:** `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`

---

## 1. Escopo Inspecionado

Foram confrontados com a implementação real da versão `1.0.0`:
- `README.md` (raiz do repositório)
- `apps/stremio-addon/QUICKSTART.md`
- `docs/CHANGELOG.md`, `docs/INSTALLATION.md`, `docs/GA_COMPATIBILITY_MATRIX.md`, `docs/GA_SECURITY_AUDIT.md`, `docs/GA_RELEASE_NOTES.md`, `docs/SPRINT_17_1_RELEASE_PREPARATION.md`
- `scripts/package-stremio-addon.mjs` (composição do pacote standalone GA)
- `apps/stremio-addon/bin/start-companion.{cmd,ps1,sh}`
- `apps/stremio-addon/src/addon/manifest.ts`, `src/config/addon-config.ts`, `src/server/routes.ts`, `src/companion/companion-auth.ts`, `src/companion/companion-persistence.ts`

---

## 2. Lacunas Encontradas na Experiência de Distribuição e Onboarding

| # | Área | Achado Real na Auditoria | Impacto para Usuários Externos | Ação na Sprint 17.2 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **`README.md` na raiz** | Documentava exclusivamente a extensão Chrome (`v1.0 Roadmap`) e omitia completamente `apps/stremio-addon` (`v1.0.0`), os 37 idiomas, o SubtitleMe Studio (`/configure`), modos ASS/SRT/VTT, Reveal Mode e instalação no Stremio. | Usuário que chega ao repositório GitHub não consegue instalar nem entender o Stremio Addon `v1.0.0`. | Reescrito completamente em `README.md` cobrindo o produto completo (`Stremio Addon v1.0.0` + `Chrome Extension v1.0.0`). |
| 2 | **`docs/INSTALLATION.md`** | Continha apenas instruções de carga unpacked da extensão Chrome, sem seção dedicada ao Stremio Addon `v1.0.0` (Windows CMD/PowerShell, Linux `.sh` e declaração honesta sobre macOS). | Falta de guia passo a passo unificado para extração, inicialização, verificação e encerramento. | Atualizado com guias separados para Windows, Linux e nota explícita de macOS não validado (preservando a seção da extensão Chrome). |
| 3 | **Guias de Usuário, Privacidade e FAQ** | Não existiam `docs/USER_GUIDE.md`, `docs/PRIVACY_AND_SECURITY.md` nem `docs/FAQ.md`. Os guias antigos (`STREMIO_USER_GUIDE.md`, `STREMIO_PRIVACY.md`) datavam das Sprints 10–11 e não documentavam os 37 idiomas, 1–5 pares ranqueados, Reveal Mode, Auto-Sync + Anti-Flicker (`380ms`), ASS vs `Branco SRT`, Subtitle Sync nem OpenSubtitles v3. | Usuários novos não encontrariam instruções atualizadas sobre recursos essenciais da `v1.0.0`. | Criados `docs/USER_GUIDE.md`, `docs/PRIVACY_AND_SECURITY.md` e `docs/FAQ.md` alinhados 100% à implementação `v1.0.0`. |
| 4 | **Composição do Pacote GA (`subtitleme-stremio-v1.0.0.tar.gz`)** | O script `scripts/package-stremio-addon.mjs` empacota `package.json`, `dist/index.mjs`, `bin/start-companion.{sh,ps1,cmd}`, `QUICKSTART.md` e `node_modules/` (que inclui as licenças das dependências de produção). Não inclui `USER_GUIDE.md`, `PRIVACY_AND_SECURITY.md`, `FAQ.md` nem `LICENSE` raiz. Além disso, `dist/` está no `.gitignore`, portanto o tarball GA não é versionado no Git (reside no host de build Windows onde foi gerado na Sprint 16.2). | Pacote GA já é funcional e autossuficiente para execução, mas o material complementar de onboarding/FAQ/privacidade precisa acompanhar a distribuição externa (ex.: página de Release ou pasta complementar). | Pacote GA original preservado intacto; criada pasta complementar `distribution/v1.0.0/` com índice documental e checklist de integridade. |
| 5 | **Descrição do `manifest.ts` vs saída real** | `manifest.ts` descreve `"combining dual-language subtitles into a single WebVTT track"`, embora a `v1.0.0` entregue `.ass`, `.srt` (`Branco SRT`) e `.vtt` conforme configuração. | Cosmético (não afeta o protocolo Stremio). Mantido sem alteração de código por governança da Sprint 17.2 (`v1.0.0` congelada) e esclarecido no `USER_GUIDE.md`. | Documentado transparentemente sem modificar o código da `v1.0.0`. |
| 6 | **Presença de RCs no diretório `dist/release/` local** | Na VM Linux atual existem os artefatos `subtitleme-chrome-v1.0.0.zip` e os RCs `rc.1`, `rc.2`, `rc.3` e `rc.6`. O tarball GA `subtitleme-stremio-v1.0.0.tar.gz` (gerado no Windows na Sprint 16.2) não é rastreado no Git por `.gitignore`. | Nenhuma perda; o hash oficial `7f298f2b...` está registrado em `docs/GA_RELEASE_NOTES.md` e `docs/SPRINT_17_1_RELEASE_PREPARATION.md`. | Todos os RCs locais preservados intactos; nenhum pacote reconstruído ou substituído. |

---

## 3. Consistência Técnica Verificada na Implementação (`v1.0.0`)

- **Porta padrão:** `7000` exclusivamente em `127.0.0.1` (`PORT` configurável; `0.0.0.0` bloqueado por `assertLoopbackHost`).
- **Endpoints reais:** `/configure`, `/manifest.json`, `/health`, `/subtitles/:type/:id.json`, `/generated/:token.(vtt|srt|ass)`, `/companion/health`, `/companion/subtitles`, `/companion/preview`, `/companion/install-url`, `/companion/storage`, `/companion/storage/consent`, `/companion/session/revoke`, `/companion/opensubtitles`, `/companion/settings`.
- **Idiomas suportados:** exatamente **37 idiomas** definidos em `STREMIO_SUPPORTED_LANGUAGES` (`apps/stremio-addon/src/config/addon-config.ts`).
- **Limites reais:** upload até `5 MB` por arquivo (`413`), cache em memória até `200` entradas / `20 MB` / TTL `15 min`, cota padrão de persistência opt-in `50 MB` (`SUBTITLEME_PERSISTENCE=1`, `encryptedAtRest: false`).
- **Compatibilidade real:** Windows 11 X64 + Node.js `>= 22` (validado em `v24.19.0`) + Stremio Desktop `5.0.28`; Linux validado até `rc.1` (não reexecutado na `v1.0.0`); **macOS não validado**; Android, Android TV, Smart TVs e iOS **não suportados**.
