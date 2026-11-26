# SubtitleMe — Checklist Operacional de Lançamento Público (`v1.0.0`)

> **Escopo do lançamento:** **SubtitleMe Stremio Addon `v1.0.0` GA** + **Landing Page (`apps/landing-page/`)** — lançamento público sem beta fechado.  
> **Fora de escopo nesta onda:** **Chrome Extension `v1.0.0 RC`** (mantida explicitamente como RC, não promovida a GA).

---

## 1. Integridade do Pacote Oficial (`v1.0.0`) — Preservar Intacto

- **Arquivo oficial:** `subtitleme-stremio-v1.0.0.tar.gz`
- **Tamanho esperado:** `2.476.194` bytes (`5.629` arquivos)
- **Commit / Tag:** `b546fc7a1590650246c3e5add923965275045d21` · `v1.0.0`
- **SHA-256 esperado:**
  ```text
  7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd
  ```

### Comandos de verificação de integridade

**Windows (PowerShell):**
```powershell
(Get-FileHash -Algorithm SHA256 .\subtitleme-stremio-v1.0.0.tar.gz).Hash.ToLower()
```

**Windows (CMD):**
```cmd
certutil -hashfile subtitleme-stremio-v1.0.0.tar.gz SHA256
```

**Linux:**
```bash
echo "7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd  subtitleme-stremio-v1.0.0.tar.gz" | sha256sum -c -
```

> **Regra:** Não reconstruir nem substituir silenciosamente o tarball oficial `v1.0.0`. Caso o hash não coincida exatamente, interromper o upload.

---

## 2. Pré-requisitos Concluídos (Sprints 17.2 – 18.2.5)

- [x] Licença MIT formalizada na raiz ([`LICENSE`](../LICENSE)) e auditoria concluída ([`docs/LICENSE_AND_IP_AUDIT.md`](LICENSE_AND_IP_AUDIT.md)).
- [x] Documentação revisada e alinhada (`README.md`, `INSTALLATION.md`, `USER_GUIDE.md`, `PRIVACY_AND_SECURITY.md`, `FAQ.md`, `BRAND_IDENTITY.md`, `SUPPORT_AND_DONATIONS.md`, `LAUNCH_ANNOUNCEMENT.md`).
- [x] Vulnerabilidades transitivas do `stremio-addon-sdk` documentadas para remediação na `v1.0.1` em [`docs/SECURITY_ADVISORIES_V1_0_0.md`](SECURITY_ADVISORIES_V1_0_0.md).
- [x] Landing page (`apps/landing-page/`) validada em desktop/mobile com `Dual Track Sync`, Tailwind CSS v4, zero telemetria e zero URLs fictícias de doação.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` (`35/35`, `141/141`) e `pnpm test:browser` aprovados.

---

## 3. Sequência Operacional de Publicação (Executar Somente Após Autorização Explícita)

### Etapa A — Commit Final e Push
- [ ] Revisar `git status` confirmando ausência de alterações em `apps/stremio-addon/`, `apps/chrome-extension/`, `packages/` e `dist/release/`.
- [ ] Criar commit limpo contendo `LICENSE`, `README.md`, `docs/`, `assets/`, `distribution/`, `apps/landing-page/`, `tests/unit/landing-page.test.ts` e `pnpm-lock.yaml`.
- [ ] Executar `git push origin main` (sem mover nem recriar a tag `v1.0.0`).

### Etapa B — GitHub Social Preview
- [ ] No GitHub (`Settings → General → Social preview`), fazer upload de [`assets/marketing/github-social-preview.png`](../assets/marketing/github-social-preview.png) (`1280×640`).

### Etapa C — Verificação Final do SHA-256 no Windows e GitHub Release `v1.0.0`
- [ ] Na máquina Windows onde reside o tarball oficial, executar `Get-FileHash -Algorithm SHA256 .\subtitleme-stremio-v1.0.0.tar.gz` e confirmar igualdade exata com `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`.
- [ ] Criar GitHub Release associada à tag existente `v1.0.0` usando o texto de [`docs/LAUNCH_ANNOUNCEMENT.md`](LAUNCH_ANNOUNCEMENT.md).
- [ ] Anexar `subtitleme-stremio-v1.0.0.tar.gz` e seu checksum SHA-256 à release.

### Etapa D — Deploy GitHub Pages
- [ ] Publicar o build estático `apps/landing-page/dist` no GitHub Pages (com `VITE_GITHUB_SPONSORS_URL` / `VITE_KOFI_URL` apenas se as contas oficiais já tiverem sido ativadas; caso contrário, publicar no estado seguro sem URLs).

### Etapa E — Verificação dos Links Públicos Pós-Publicação
- [ ] Abrir a URL pública do GitHub Pages em desktop e mobile e confirmar carregamento de imagens, ícones, Demo Interativa e link `Licença MIT` (`.../blob/main/LICENSE`).
- [ ] Confirmar download e checksum do asset anexado na GitHub Release `v1.0.0`.
- [ ] Conferir renderização do `README.md` e do Social Preview no repositório GitHub.
