# Fluxo Completo de Onboarding — SubtitleMe `v1.0.0` (13 Etapas)

Mapeamento ponta a ponta da jornada de primeiro uso de um usuário externo, confrontado diretamente com a implementação da versão `1.0.0`.

---

## 1. Matriz das 13 Etapas de Onboarding

| # | Etapa | Ação do Usuário | Resultado Esperado | Possíveis Dificuldades | Mensagem / Orientação Disponível | Referência Documental |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Descoberta** | Acessa o repositório `SubtitleMe` | Compreende rapidamente que o produto exibe dois idiomas simultâneos no Stremio Desktop localmente | Confundir Extensão Chrome com Stremio Addon | `README.md` separa claramente os dois produtos na abertura | [README.md](../../README.md) |
| 2 | **Proposta de valor** | Lê seção de problema e recursos | Entende o diferencial local-first, 37 idiomas, Modo Reveal, Auto-Sync e `.ASS`/`Branco SRT` | Expectativa de uso em celular/TV | Seção de limitações informa imediatamente que é exclusivo `127.0.0.1` | [README.md](../../README.md) |
| 3 | **Requisitos** | Confere Node.js `>= 22` e Stremio Desktop | Sabe exatamente se seu PC é compatível (`node --version`) | Usuário sem Node.js ou com Node < 22 | Launchers `.cmd`/`.ps1`/`.sh` verificam Node 22+ e exibem erro claro com link `nodejs.org` | [docs/INSTALLATION.md](../../docs/INSTALLATION.md) |
| 4 | **Obtenção e integridade** | Baixa `subtitleme-stremio-v1.0.0.tar.gz` e confere SHA-256 | Hash confere (`7f298f2b...`) | Usuário não habituado a verificar SHA-256 | Comandos copiáveis (`Get-FileHash` / `sha256sum`) em `RELEASE_INFO.md` | [RELEASE_INFO.md](./RELEASE_INFO.md) |
| 5 | **Extração** | Extrai o tarball com `tar -xzf` em pasta dedicada | Pasta contém `QUICKSTART.md`, `dist/index.mjs`, `bin/` e `node_modules/` | Extrair em pasta protegida do sistema (`C:\Program Files`) | Recomendação explícita de extrair em `%USERPROFILE%\SubtitleMe` ou `~/subtitleme-stremio` | [RELEASE_INFO.md](./RELEASE_INFO.md) |
| 6 | **Inicialização do Companion** | Executa `.\bin\start-companion.cmd` (Windows) ou `./bin/start-companion.sh` (Linux) | Terminal exibe `listening at http://127.0.0.1:7000` | Porta `7000` ocupada ou bloqueio de `ExecutionPolicy` no `.ps1` | `checkPortAvailable()` sugere `PORT=7001`; `.cmd` evita `ExecutionPolicy` | [docs/INSTALLATION.md](../../docs/INSTALLATION.md) |
| 7 | **Acesso à configuração** | Abre `http://127.0.0.1:7000/configure` | Painel **SubtitleMe Studio** carrega com badge verde de conexão ativa | Fechar a janela do terminal acidentalmente | Banner vermelho de **Companion Offline** exibe o comando exato para reiniciar | [docs/USER_GUIDE.md](../../docs/USER_GUIDE.md) |
| 8 | **Instalação no Stremio** | Clica em **Instalar no Stremio** ou cola `http://127.0.0.1:7000/manifest.json` em **+ Adicionar Complemento** | Addon **SubtitleMe (`1.0.0`)** instalado no Stremio Desktop | Tentar reinstalar a cada ajuste de cor/idioma | Aviso explícito: instale apenas **uma vez**; mudanças aplicam ao vivo | [docs/INSTALLATION.md](../../docs/INSTALLATION.md) |
| 9 | **Importação de legendas (opcional)** | Usa fontes automáticas (OpenSubtitles v3 já ativo) ou envia `.srt`/`.vtt` local via API Companion | Faixas disponíveis automaticamente ou salvas localmente (≤ 5 MB) | Achar que precisa baixar `.srt` manualmente para todo filme | `FAQ.md` e `USER_GUIDE.md` esclarecem que OpenSubtitles v3 já vem ativo por padrão | [docs/FAQ.md](../../docs/FAQ.md) |
| 10 | **Associação ao conteúdo** | No modo local, informa o `contentId` exato (`tt1254207` ou `tt0903747:1:2`) | Correspondência exata sem misturar episódios ou filmes | Informar nome de arquivo em vez de `contentId` | Validador rejeita URLs/caminhos e orienta a usar ID IMDb ou identificador explícito | [docs/USER_GUIDE.md](../../docs/USER_GUIDE.md) |
| 11 | **Configuração de idiomas** | Escolhe **Estou aprendendo** + **Meu idioma** entre os 37 idiomas, ordem, pares (`1–5`) e estilo | Prévia ao vivo atualiza e `RuntimeSettingsStore` salva instantaneamente | Escolher o mesmo idioma nos dois campos | Validação impede idiomas iguais com mensagem clara | [docs/USER_GUIDE.md](../../docs/USER_GUIDE.md) |
| 12 | **Seleção Dual no player** | Reproduz filme/episódio no Stremio Desktop e escolhe `Dual ... 1` (ou `2`, `3`) no menu de legendas | Duas línguas exibidas simultaneamente | Cores `.ASS` não aparecerem no Stremio | Guia destaca ativar **Configurações › Reprodutor › Estilizar legendas ASS** (ou usar **Branco SRT**) | [docs/USER_GUIDE.md](../../docs/USER_GUIDE.md) |
| 13 | **Confirmação e encerramento** | Verifica sincronização, testa troca de par se necessário e encerra com `Ctrl + C` ao terminar | Encerramento gracioso e porta `7000` liberada | Perder ajustes ao reiniciar sem persistência | Documentado uso opcional de `SUBTITLEME_PERSISTENCE=1` | [docs/FAQ.md](../../docs/FAQ.md) |

---

## 2. Pontos de Fricção Identificados (Para Futuras Releases, sem Alterar `v1.0.0`)

1. **Dependência de Node.js `>= 22` pré-instalado:** usuários não técnicos precisam instalar o Node.js antes de rodar `start-companion.cmd`. Em versões futuras (pós-1.0), um instalador com runtime embarcado reduziria essa fricção.
2. **Ativação manual de `Estilizar legendas ASS` no Stremio Desktop:** necessária uma única vez no player para exibir cores `.ASS`; mitigada documentalmente com destaque no `README.md`, `QUICKSTART.md`, `USER_GUIDE.md` e `FAQ.md` (e alternativa `Branco SRT`).
3. **Janela de terminal aberta em primeiro plano:** decisão intencional de segurança/transparência na `v1.0.0` (sem daemon oculto em segundo plano), explicada claramente no `FAQ.md`.
