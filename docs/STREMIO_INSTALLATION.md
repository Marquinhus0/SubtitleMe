# SubtitleMe — Stremio Addon Installation Guide (Redirecionamento Canônico)

> **Aviso de consolidação documental:** Este documento pertencia à fase inicial (**Local MVP**) e foi substituído pelos guias oficiais e atualizados da release **`v1.0.0` GA**. Para instalar e executar o SubtitleMe Stremio Addon + Local Companion, utilize os documentos canônicos abaixo.

---

## Documentação Canônica de Instalação

- **Guia oficial completo (Windows, Linux, macOS e Extensão Chrome):** [`docs/INSTALLATION.md`](./INSTALLATION.md)
- **Guia operacional embarcado no pacote standalone:** [`apps/stremio-addon/QUICKSTART.md`](../apps/stremio-addon/QUICKSTART.md)
- **Metadados da release `v1.0.0` e verificação SHA-256:** [`distribution/v1.0.0/RELEASE_INFO.md`](../distribution/v1.0.0/RELEASE_INFO.md)
- **Configuração avançada e persistência local opcional:** [`docs/STREMIO_COMPANION_SETUP.md`](./STREMIO_COMPANION_SETUP.md) e [`docs/STREMIO_PERSISTENCE.md`](./STREMIO_PERSISTENCE.md)

---

## Resumo Rápido (`v1.0.0` Standalone — Windows)

1. Baixe o pacote oficial `subtitleme-stremio-v1.0.0.tar.gz` e verifique o SHA-256 conforme [`docs/INSTALLATION.md`](./INSTALLATION.md).
2. Extraia e inicie o Local Companion (sem necessidade de `pnpm install`):
   ```cmd
   .\bin\start-companion.cmd
   ```
3. Abra **`http://127.0.0.1:7000/configure`** no navegador e clique em **Instalar no Stremio** (ou instale `http://127.0.0.1:7000/manifest.json` no Stremio Desktop).

---

## Contexto Histórico (Local MVP)

Na fase inicial do desenvolvimento (**Local MVP**), o Stremio Addon era executado diretamente a partir do monorepo (`pnpm install && pnpm --filter @subtitleme/stremio-addon start`) e operava exclusivamente via upload manual de arquivos `.srt`/`.vtt` na página `/configure`, com geração de URL contendo configuração codificada no caminho (`http://127.0.0.1:7000/<config>/manifest.json`).

A partir da **`v1.0.0` GA**, o SubtitleMe passou a distribuir um pacote **standalone** independente (`node_modules/` já incluído, launchers nativos `.cmd`/`.ps1`/`.sh`), descoberta automática de legendas com até 5 pares bilíngues ranqueados, suporte a 37 idiomas, edição ao vivo sem reinstalar o addon (`http://127.0.0.1:7000/manifest.json`) e API local autenticada opcional para importação de `.srt`/`.vtt`.
