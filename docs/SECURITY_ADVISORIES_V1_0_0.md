# SubtitleMe — Registro de Vulnerabilidades Transitivas (`v1.0.0` → Corrigidas na `v1.0.1`)

> **Status histórico na `v1.0.0`:** Presentes no pacote congelado `v1.0.0` (mitigadas operacionalmente por loopback `127.0.0.1`, validação estrita de `Host`/`Origin` e não uso de `inquirer` em runtime; o artefato `v1.0.0` foi preservado intacto por governança).  
> **Status atual na `v1.0.1`:** **TODAS AS 5 ADVISORIES CORRIGIDAS** na release oficial [**`v1.0.1`**](https://github.com/Marquinhus0/SubtitleMe/releases/tag/v1.0.1) (`pnpm audit --prod`: `0` vulnerabilidades; `npm audit --omit=dev` no pacote standalone: `0` vulnerabilidades).

---

## 1. Resumo Histórico da Auditoria (`v1.0.0`) e Remediação (`v1.0.1`)

A execução de `pnpm audit --prod` na base `v1.0.0` identificou **5 vulnerabilidades transitivas** (`4 high`, `1 low`), todas originadas exclusivamente na cadeia de dependências de `stremio-addon-sdk@1.6.10`:

| Advisory | Pacote | Severidade | Caminho de dependência | Estado na `v1.0.0` | Estado na `v1.0.1` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GHSA-9wv6-86v2-598j` | `path-to-regexp` | High | `apps/stremio-addon > stremio-addon-sdk > router > path-to-regexp` | Afetada (`0.1.7`, mitigada operacionalmente) | **Corrigida (`0.1.13`)** |
| `GHSA-rhx6-c78j-4q9w` | `path-to-regexp` | High | `apps/stremio-addon > stremio-addon-sdk > router > path-to-regexp` | Afetada (`0.1.7`, mitigada operacionalmente) | **Corrigida (`0.1.13`)** |
| `GHSA-37ch-88jc-xwx2` | `path-to-regexp` | High | `apps/stremio-addon > stremio-addon-sdk > router > path-to-regexp` | Afetada (`0.1.7`, mitigada operacionalmente) | **Corrigida (`0.1.13`)** |
| `GHSA-ph9p-34f9-6g65` | `tmp` | High | `apps/stremio-addon > stremio-addon-sdk > inquirer > external-editor > tmp` | Afetada (`0.0.33`, código não invocado em runtime) | **Corrigida (`0.2.7`)** |
| `GHSA-52f5-9888-hmc6` | `tmp` | Low | `apps/stremio-addon > stremio-addon-sdk > inquirer > external-editor > tmp` | Afetada (`0.0.33`, código não invocado em runtime) | **Corrigida (`0.2.7`)** |

---

## 2. Mitigações Históricas na `v1.0.0`

1. **`path-to-regexp@0.1.7` (ReDoS em parsing de rotas HTTP):**
   - **Mitigação na `v1.0.0`:** o Local Companion realiza bind exclusivo em **`127.0.0.1`** (recusa `0.0.0.0`, `::` e IPs de LAN) e aplica validação estrita de cabeçalhos `Host` e `Origin`, impedindo requisições remotas não autorizadas.
   - **Limitação na `v1.0.0`:** processos locais na mesma máquina do usuário ainda podiam enviar requisições para `127.0.0.1:7000`.
2. **`tmp@0.0.33` via `stremio-addon-sdk > inquirer > external-editor > tmp`:**
   - **Mitigação na `v1.0.0`:** o SubtitleMe Local Companion não utiliza a CLI interativa (`inquirer` / `external-editor`) do `stremio-addon-sdk` em nenhum fluxo de execução.

---

## 3. Remediação Aplicada na Release Oficial `v1.0.1`

- **Release oficial:** https://github.com/Marquinhus0/SubtitleMe/releases/tag/v1.0.1
- **Versões corrigidas aplicadas via overrides escopados (`pnpm-workspace.yaml` e `overrides` npm no `package.json` standalone gerado por `scripts/package-stremio-addon.mjs`):**
  - `router > path-to-regexp`: **`0.1.13`** (unificado com `express@4.22.3`).
  - `external-editor > tmp`: **`0.2.7`**.
- **Validação pós-correção:**
  - `corepack pnpm audit --prod`: **`0` vulnerabilidades** (`No known vulnerabilities found`).
  - `npm audit --omit=dev` dentro de `subtitleme-stremio-v1.0.1.tar.gz` extraído em ambiente limpo: **`0` vulnerabilidades**.
  - Recomendação a usuários da `v1.0.0`: atualizar para `subtitleme-stremio-v1.0.1.tar.gz` (SHA-256 `ae0c27694b609c9585266af4a8f72f55a9e1412e78a58a1be2c6061a08b40e5d`).
