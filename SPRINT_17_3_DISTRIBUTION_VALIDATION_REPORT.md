# Relatório Final — Sprint 17.3: Distribution Package & Onboarding Validation (`v1.0.0`)

**Data:** 2026-11-26  
**Release Oficial:** SubtitleMe Stremio Addon `v1.0.0`  
**Repositório:** `https://github.com/Marquinhus0/SubtitleMe`  
**Branch / Commit (`HEAD`):** `main` · `b546fc7a1590650246c3e5add923965275045d21`  
**Tag Remota (`origin`):** `v1.0.0`  
**Pacote GA Original:** `subtitleme-stremio-v1.0.0.tar.gz` (`2.476.194` bytes · `5.629` arquivos)  
**SHA-256 Oficial GA:** `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`

---

## 1. Estrutura Final de Distribuição (Sem Duplicação Desnecessária)

Preservando `docs/` e `apps/stremio-addon/QUICKSTART.md` como **fonte principal única** (evitando divergência entre cópias manuais), a pasta `distribution/v1.0.0/` foi organizada como hub complementar de distribuição:

```text
distribution/v1.0.0/
├── README.md            # Índice completo de distribuição e links para fonte principal
├── RELEASE_INFO.md      # Metadados GA, tamanho real, SHA-256, verificação Windows/Linux e extração
└── ONBOARDING_FLOW.md   # Fluxo validado de 13 etapas + análise de fricção de primeiro uso
```

Referenciando diretamente a documentação principal verificada:
- `README.md`
- `apps/stremio-addon/QUICKSTART.md` (embutido no tarball GA)
- `docs/INSTALLATION.md`
- `docs/USER_GUIDE.md`
- `docs/PRIVACY_AND_SECURITY.md`
- `docs/FAQ.md`
- `docs/GA_RELEASE_NOTES.md` e `docs/GA_COMPATIBILITY_MATRIX.md`

---

## 2. Fluxo de Onboarding (13 Etapas) e Melhorias Documentais

Todas as **13 etapas** da jornada de primeiro uso (Descoberta → Proposta → Requisitos → Integridade SHA-256 → Extração → Inicialização → `/configure` → Instalação no Stremio → Fontes/Importação → `contentId` → Idiomas → Seleção Dual → Encerramento) foram auditadas e documentadas em [`distribution/v1.0.0/ONBOARDING_FLOW.md`](./distribution/v1.0.0/ONBOARDING_FLOW.md), cobrindo ação do usuário, resultado esperado, possíveis dificuldades, mensagens reais do software e referência documental.

### Pontos de Fricção Identificados (Registrados sem Alterar `v1.0.0`)
1. Necessidade de Node.js `>= 22` pré-instalado (mitigada por checagem clara nos launchers).
2. Ativação única de **Estilizar legendas ASS** no Stremio Desktop para cores `.ASS` (mitigada com destaque no `README.md`, `QUICKSTART.md`, `USER_GUIDE.md`, `FAQ.md` e alternativa `Branco SRT`).
3. Janela de terminal em primeiro plano (decisão intencional de segurança sem daemon oculto).

---

## 3. Teste de Instalação Limpa (Fora do Monorepo)

### 3.1 Linux (`v1.0.0` — Executado em Tempo Real nesta Sprint)
- **Ambiente:** `Linux 6.18.57 x86_64` · `Node.js v22.23.5`
- **Diretório isolado fora do monorepo:** `/tmp/subtitleme-v100-linux-clean-PcxQjQ` (removido ao final)
- **Artefatos montados no teste isolado:** `package.json` (`1.0.0`, sem `workspace:*`), `dist/index.mjs` (`266.87 kB`), `bin/start-companion.sh`, `QUICKSTART.md` e dependências de produção (`npm install --omit=dev`).
- **Resultados reais verificados:**
  - `QUICKSTART.md` presente e legível: **PASS**
  - Inicialização via `bin/start-companion.sh` em `127.0.0.1:17910`: **PASS**
  - `GET /companion/health`: **`200 OK`** (`127.0.0.1`, `localOnly: true`)
  - `GET /manifest.json`: **`200 OK`** (`version: "1.0.0"`)
  - `GET /configure`: **`200 OK`** (token efêmero 256-bit presente)
  - Upload local SRT + VTT (`POST /companion/subtitles` para `tt1254207`): **`201 Created`**
  - Consulta Stremio (`GET /subtitles/movie/tt1254207.json`): **`200 OK`** (`1` faixa bilíngue)
  - Entrega da faixa combinada (`GET /generated/87451d51a6c7dc143ad21e337d8e0ac...vtt`): **`200 OK`**, `Content-Type: text/vtt; charset=utf-8`, contendo ambos os idiomas
  - Encerramento gracioso (`SIGTERM`): **`exitCode: 0`**

### 3.2 Windows (`v1.0.0` — Evidência Preservada da Sprint 16.2)
- Como esta sessão executa em VM Linux, **nenhuma execução Windows foi simulada nesta sprint**.
- A instalação limpa real de `subtitleme-stremio-v1.0.0.tar.gz` no **Windows 11 X64** (`Node.js v24.19.0`, `bin\start-companion.cmd`, Stremio Desktop `5.0.28`) foi validada e aprovada na Sprint 16.2 (documentada em [`docs/SPRINT_16_2_GA_RELEASE_REPORT.md`](./docs/SPRINT_16_2_GA_RELEASE_REPORT.md)).

### 3.3 macOS
- Permanece explicitamente **`Não Validado` (`Not Tested`)**.

---

## 4. QA Documental & Integridade (Fase 7)

- **Links internos verificados:** `42/42` links válidos em `12` arquivos → **`0` links quebrados**.
- **Varredura de segredos/credenciais:** **`0` ocorrências**.
- **Consistência técnica:** versão `1.0.0`, porta padrão `7000`, `127.0.0.1`, 37 idiomas, SHA-256 `7f298f2b...`, endpoints e limitações consistentes em toda a documentação.
- **Preservação do Pacote GA e dos RCs:** todos os artefatos existentes em `dist/release/` (`subtitleme-chrome-v1.0.0.zip`, `rc.1`, `rc.2`, `rc.3`, `rc.6`) permaneceram intactos; nenhum pacote GA foi sobrescrito ou recriado em `dist/release/`.

---

## 5. Estado Git, Pendências para Distribuição Pública e Governança

- **Estado Git:** `HEAD` permanece em `b546fc7a1590650246c3e5add923965275045d21` (`main`). Somente arquivos documentais criados/atualizados no working tree (`0` alterações em `apps/*` ou `packages/*`).
- **Governança confirmada:** **nenhum** `git commit`, `git tag`, `git push`, GitHub Release ou publicação em lojas/serviços foi executado.
- **Pendências para futura distribuição pública (quando autorizada):**
  1. Adicionar arquivo `LICENSE` na raiz do repositório.
  2. Anexar o tarball oficial `subtitleme-stremio-v1.0.0.tar.gz` (`SHA-256: 7f298f2b...`) e `.sha256` em um futuro GitHub Release oficial (após autorização explícita).
  3. Opcionalmente validar Stremio Desktop visualmente no Linux e testar macOS em releases futuras pós-`1.0.0`.
