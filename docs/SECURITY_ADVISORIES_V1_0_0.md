# SubtitleMe — Registro de Vulnerabilidades Transitivas (`v1.0.0` → `v1.0.1`)

> **Status na `v1.0.0`:** Documentadas e **não corrigidas** no pacote congelado `v1.0.0` (conforme governança de não alterar o artefato GA validado nem atualizar dependências sem necessidade comprovada).  
> **Alvo de remediação:** Release de manutenção **`v1.0.1`**.

---

## 1. Resumo da Auditoria (`pnpm audit --prod`)

A execução de `pnpm audit --prod` na base `v1.0.0` identificou **5 vulnerabilidades transitivas** (`4 high`, `1 low`), todas originadas exclusivamente na cadeia de dependências de `stremio-addon-sdk@1.6.10`:

| Advisory | Pacote | Severidade | Caminho de dependência | Estado na `v1.0.0` |
| :--- | :--- | :--- | :--- | :--- |
| `GHSA-9wv6-86v2-598j` | `path-to-regexp` | High | `apps/stremio-addon > stremio-addon-sdk > router > path-to-regexp` | Aberta (mitigada operacionalmente) |
| `GHSA-rhx6-c78j-4q9w` | `path-to-regexp` | High | `apps/stremio-addon > stremio-addon-sdk > router > path-to-regexp` | Aberta (mitigada operacionalmente) |
| `GHSA-37ch-88jc-xwx2` | `path-to-regexp` | High | `apps/stremio-addon > stremio-addon-sdk > router > path-to-regexp` | Aberta (mitigada operacionalmente) |
| `GHSA-ph9p-34f9-6g65` | `tmp` | High | `apps/stremio-addon > stremio-addon-sdk > inquirer > external-editor > tmp` | Aberta (código não invocado em runtime) |
| `GHSA-52f5-9888-hmc6` | `tmp` | Low | `apps/stremio-addon > stremio-addon-sdk > inquirer > external-editor > tmp` | Aberta (código não invocado em runtime) |

---

## 2. Mitigações Existentes na `v1.0.0` e Limitações

1. **`path-to-regexp` (ReDoS em parsing de rotas HTTP):**
   - **Mitigação:** o Local Companion realiza bind exclusivo em **`127.0.0.1`** (recusa `0.0.0.0`, `::` e IPs de LAN) e aplica validação estrita de cabeçalhos `Host` e `Origin`, impedindo requisições remotas não autorizadas.
   - **Limitação:** processos locais na mesma máquina do usuário ainda podem enviar requisições para `127.0.0.1:7000`; por isso a correção definitiva via atualização do SDK ou `pnpm.overrides` permanece planejada para `v1.0.1`.
2. **`tmp` via `stremio-addon-sdk > inquirer > external-editor > tmp`:**
   - **Mitigação:** o SubtitleMe Local Companion não utiliza a CLI interativa (`inquirer` / `external-editor`) do `stremio-addon-sdk` em nenhum fluxo de execução.
   - **Limitação:** a dependência transitiva permanece listada no `pnpm-lock.yaml` e no grafo do pacote `v1.0.0` até ser atualizada ou removida na `v1.0.1`.

---

## 3. Plano de Tratamento para `v1.0.1`

- Avaliar atualização upstream do `stremio-addon-sdk` ou aplicação de `pnpm.overrides` para `path-to-regexp` e `tmp` com revalidação completa de regressão (unitários, integração e teste visual no Stremio Desktop).
