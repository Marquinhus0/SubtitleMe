# SubtitleMe Stremio Addon `v1.0.0` — Material Complementar de Distribuição

Esta pasta contém **exclusivamente material documental complementar** para acompanhar a distribuição controlada da release **`v1.0.0`** do SubtitleMe Stremio Addon, preservando intactos o pacote GA original e todos os Release Candidates anteriores.

---

## 1. Artefato Oficial GA (Preservado sem Modificações)

- **Pacote Standalone:** `subtitleme-stremio-v1.0.0.tar.gz`
- **Tamanho:** `2.476.194` bytes (`5.629` arquivos)
- **SHA-256:** `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`
- **Tag Git de Referência:** `v1.0.0` (`b546fc7a1590650246c3e5add923965275045d21`)

### Conteúdo Empacotado no Tarball Standalone (`scripts/package-stremio-addon.mjs`)
- `package.json` (sem referências `workspace:*`, `engines.node >= 22.0.0`)
- `dist/index.mjs` (bundle ESM pronto para Node.js)
- `bin/start-companion.cmd` (launcher Windows CMD recomendado)
- `bin/start-companion.ps1` (launcher Windows PowerShell)
- `bin/start-companion.sh` (launcher POSIX / Linux)
- `QUICKSTART.md` (guia operacional embutido no pacote)
- `node_modules/` (dependências de produção incluindo `stremio-addon-sdk` e respectivas licenças)

---

## 2. Documentação Complementar de Onboarding (Fonte Principal sem Duplicação)

Ao distribuir o tarball `subtitleme-stremio-v1.0.0.tar.gz` para usuários externos (por exemplo, em um futuro GitHub Release), disponibilize junto os seguintes documentos:

- [Informações de Release e Verificação SHA-256 (`RELEASE_INFO.md`)](./RELEASE_INFO.md)
- [Fluxo Completo de Onboarding em 13 Etapas (`ONBOARDING_FLOW.md`)](./ONBOARDING_FLOW.md)
- [Apresentação Geral (`README.md`)](../../README.md)
- [Quickstart Embutido no Pacote (`apps/stremio-addon/QUICKSTART.md`)](../../apps/stremio-addon/QUICKSTART.md)
- [Guia de Instalação — Windows, Linux e nota sobre macOS (`docs/INSTALLATION.md`)](../../docs/INSTALLATION.md)
- [Guia de Utilização `v1.0.0` (`docs/USER_GUIDE.md`)](../../docs/USER_GUIDE.md)
- [Privacidade e Segurança (`docs/PRIVACY_AND_SECURITY.md`)](../../docs/PRIVACY_AND_SECURITY.md)
- [FAQ e Troubleshooting (`docs/FAQ.md`)](../../docs/FAQ.md)
- [Notas de Release GA (`docs/GA_RELEASE_NOTES.md`)](../../docs/GA_RELEASE_NOTES.md)
- [Matriz de Compatibilidade (`docs/GA_COMPATIBILITY_MATRIX.md`)](../../docs/GA_COMPATIBILITY_MATRIX.md)
