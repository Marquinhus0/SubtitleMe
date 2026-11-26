# Relatório Final — Sprint 17.2: Distribution Preparation & User Onboarding (`v1.0.0`)

**Data:** 2026-11-26  
**Produto:** SubtitleMe (`@subtitleme/stremio-addon@1.0.0`)  
**Commit Base Verificado (`HEAD`):** `b546fc7a1590650246c3e5add923965275045d21` (`main`)  
**Tag Remota Verificada (`origin`):** `v1.0.0` (`f2dc2aa57ff3f1ee6df49ac04bfe62f94abb9f3f` → `b546fc7a1590650246c3e5add923965275045d21`)  
**Pacote GA de Referência:** `subtitleme-stremio-v1.0.0.tar.gz` (`SHA-256: 7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`)

---

## 1. Auditoria Inicial e Lacunas Encontradas

A auditoria registrada em [DISTRIBUTION_AUDIT.md](./DISTRIBUTION_AUDIT.md) confrontou toda a documentação existente com a implementação real da `v1.0.0` e identificou:
1. `README.md` documentava apenas a extensão Chrome (`v1.0 Roadmap`) e omitia o Stremio Addon `v1.0.0`, os 37 idiomas, o SubtitleMe Studio, o Modo Reveal, os modos `.ASS`/`.SRT`/`.VTT` e os launchers.
2. `docs/INSTALLATION.md` cobria apenas a extensão Chrome, sem instruções dedicadas para Windows (CMD/PowerShell), Linux (`.sh`) e declaração explícita de macOS não validado.
3. Faltavam os guias consolidados de onboarding para a `v1.0.0`: `docs/USER_GUIDE.md`, `docs/PRIVACY_AND_SECURITY.md`, `docs/FAQ.md` e `docs/LANDING_PAGE_CONTENT.md`.
4. O tarball standalone (`scripts/package-stremio-addon.mjs`) já contém todos os artefatos mínimos de execução (`package.json`, `dist/index.mjs`, `bin/start-companion.{cmd,ps1,sh}`, `QUICKSTART.md` e `node_modules/`), mas a documentação estendida de onboarding foi organizada de forma complementar em `distribution/v1.0.0/README.md` sem alterar o artefato GA original.

---

## 2. Arquivos Criados e Alterados

### Criados (`7` arquivos)
- `DISTRIBUTION_AUDIT.md` — Auditoria completa de distribuição e onboarding da Fase 1.
- `docs/USER_GUIDE.md` — Guia de utilização completo alinhado 100% à `v1.0.0` (37 idiomas, 1–5 pares ranqueados, roteamento, importação local SRT/VTT por `contentId`, Auto-Sync + Anti-Flicker `380ms`, offsets `±30.000ms`, Reveal Mode `0s–2s`, `.ASS` vs `Branco SRT` vs `.VTT`).
- `docs/PRIVACY_AND_SECURITY.md` — Arquitetura `127.0.0.1`, token de sessão 256-bit (`12h` TTL), CSRF, anti-DNS rebinding (`Host`), `Origin`, separação CORS/PNA, limites (5 MB / 20 MB / 200 entradas / 50 MB disco), serviços externos opcionais, ausência de scraping e divulgação transparente de `encryptedAtRest: false`.
- `docs/FAQ.md` — 11 perguntas frequentes e soluções reais de troubleshooting sem inventar funcionalidades.
- `docs/LANDING_PAGE_CONTENT.md` — Conteúdo editorial completo (9 seções) em identidade Obsidian/Dark + Emerald/Mint (nenhum site desenvolvido ou publicado).
- `distribution/v1.0.0/README.md` — Índice documental complementar para distribuição externa preservando intacto o pacote GA original.
- `SPRINT_17_2_DISTRIBUTION_REPORT.md` — Este relatório final.

### Alterados (`2` arquivos)
- `README.md` — Reescrito como porta de entrada profissional do produto completo (`Stremio Addon v1.0.0` + `Chrome Extension v1.0.0 RC`).
- `docs/INSTALLATION.md` — Atualizado com guias separados para Windows (CMD/PowerShell), Linux (`.sh` com aviso de compatibilidade) e macOS (explicitamente `Não Validado`), preservando a seção da extensão Chrome.

*(Nenhum arquivo de código em `apps/` ou `packages/` foi alterado; a versão `1.0.0` permanece intocada.)*

---

## 3. Compatibilidade Documentada (Sem Exageros)

- **Windows 11 X64 (`Node.js >= 22`, validado em `v24.19.0` + Stremio Desktop `5.0.28`):** plataforma principal validada na `v1.0.0`.
- **Linux (`./bin/start-companion.sh`):** `Partially Tested` (validado em RCs `rc.1`–`rc.3` com Node `v22.23.5`; não reexecutado na `v1.0.0`; Stremio Desktop Linux não testado visualmente).
- **macOS:** explicitamente declarado **`Não Validado` (`Not Tested`)**, sem instruções enganosas.
- **Stremio Web (`https://web.stremio.com`):** restrito ao mesmo computador com navegador que suporte Private Network Access (PNA).
- **Android, Android TV, Google TV, Smart TVs e iOS:** explicitamente **`Não Suportados`** pela arquitetura loopback exclusiva `127.0.0.1`.

---

## 4. Resultado do QA Documental (Fase 9)

- **Links internos verificados:** `25` links relativos em `9` arquivos → **`0` links quebrados**.
- **Varredura de segredos/credenciais:** **`0` ocorrências**.
- **Confronto com implementação `v1.0.0`:** porta (`7000`), loopback (`127.0.0.1`), endpoints (`/configure`, `/manifest.json`, `/companion/health`, `/companion/subtitles`, `/companion/session/revoke`, `/generated/:token.(ass|srt|vtt)`), 37 idiomas, limites (`5 MB`, `200` entradas / `20 MB` / `15 min`, `50 MB` disco), Modo Reveal (`0s–2s`), Anti-Flicker (`380ms`) e `Branco SRT` conferem 100% com o código em `b546fc7a1590650246c3e5add923965275045d21`.

---

## 5. Riscos e Pendências

1. **Ausência de `LICENSE` raiz no repositório:** o pacote GA contém licenças das dependências em `node_modules/`, mas definir uma licença open-source explícita na raiz do repositório é recomendável antes da publicação pública.
2. **Tarball GA no host de release:** como `dist/` está no `.gitignore`, o artefato `subtitleme-stremio-v1.0.0.tar.gz` (`SHA-256: 7f298f2b...`) deverá ser anexado manualmente na futura etapa de publicação (quando autorizada).
3. **Validação Linux `v1.0.0` e macOS:** continuam pendentes caso se deseje ampliar a matriz oficial em releases futuras.

---

## 6. Confirmações de Governança

- **Pacote GA e RCs preservados:** nenhum artefato em `dist/release/` foi alterado, sobrescrito ou removido.
- **Nenhuma alteração de código ou versão:** `apps/*`, `packages/*` e a versão `1.0.0` permanecem intocados.
- **Nenhuma ação Git ou publicação externa realizada:** `HEAD` permanece em `b546fc7a1590650246c3e5add923965275045d21`; nenhum `git commit`, nenhuma `git tag`, nenhum `git push`, nenhuma GitHub Release e nenhuma publicação em lojas foram executados.
