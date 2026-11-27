# SubtitleMe Stremio Addon (`v1.0.1`) — Quickstart & Guia Operacional

O **SubtitleMe** combina legendas em dois idiomas simultâneos no Stremio Desktop usando um servidor **100% local** (`127.0.0.1`), sem contas na nuvem, sem assinaturas e com edição ao vivo.

---

## 1. Requisitos de Execução

- **Node.js:** `>= 22.0.0` (ambiente validado: **Windows 11 X64** com **Node.js `v24.19.0`**).
- **Player validado:** **Stremio Desktop `5.0.28`** no mesmo computador.
- **Conexão de rede:** necessária apenas para consultar provedores externos opcionais (**OpenSubtitles v3**, **OpenSubtitles REST API v1** e **Subtitle Sync**). O servidor nunca se expõe para a rede local (`0.0.0.0` é bloqueado).

---

## 2. Instalação e Extração do Pacote Standalone

Este pacote é totalmente independente do monorepo e já contém todas as dependências de produção (`node_modules/`):

```powershell
mkdir subtitleme-stremio
tar -xzf subtitleme-stremio-v1.0.1.tar.gz -C subtitleme-stremio
cd subtitleme-stremio
```

---

## 3. Como Iniciar o Local Companion

### Windows (Recomendado — Launcher `.cmd`)
Não exige alterar `ExecutionPolicy` do PowerShell:

```cmd
.\bin\start-companion.cmd
```

Para manter configurações e provedores salvos em disco entre reinicializações (persistência local opt-in em `%USERPROFILE%\.subtitleme\stremio-companion`):

```cmd
set SUBTITLEME_PERSISTENCE=1
.\bin\start-companion.cmd
```

### Windows (Alternativa — PowerShell `.ps1` ou `node` direto)
Em sistemas com `ExecutionPolicy=Restricted`, execute com bypass restrito ao processo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\bin\start-companion.ps1
```
Ou diretamente com Node.js:
```powershell
node .\dist\index.mjs
```

### Linux / macOS (Launcher `.sh`)
O launcher `./bin/start-companion.sh` acompanha o pacote para ambientes POSIX:
```bash
chmod +x ./bin/start-companion.sh
./bin/start-companion.sh
```
> **Nota de compatibilidade:** o launcher Linux foi validado em versões RC anteriores (`rc.1` em Linux/Node 22), mas **não foi reexecutado na `v1.0.0`**. **macOS não foi testado** nesta release.

---

## 4. Configuração Inicial no Stremio Desktop

1. Com o Companion rodando, abra no navegador: **http://127.0.0.1:7000/configure**
2. Clique em **Instalar no Stremio** (ou copie `http://127.0.0.1:7000/manifest.json` e cole em **Stremio → Complementos → + Adicionar Complemento**).
3. Instale apenas **uma vez**: qualquer ajuste feito posteriormente em `/configure` é aplicado em tempo real no Companion sem precisar reinstalar o addon.

---

## 5. Como Usar o SubtitleMe Studio (`/configure`)

### Configurar Idiomas e Modo de Leitura
- Escolha **Estou aprendendo** e **Meu idioma** entre os **37 idiomas suportados** (`Inglês`, `Português (Brasil)`, `Espanhol`, `Francês`, `Alemão`, `Italiano`, `Japonês`, `Coreano`, `Chinês`, entre outros).
- Defina a **Ordem vertical** (idioma de aprendizado no topo ou seu idioma no topo).
- Ajuste **Opções ranqueadas no Stremio** (`1` a `5` pares) e **Modo Reveal** (`0s`, `0.5s`, `1s`, `1.5s`, `2s`) para atrasar a tradução sem deslocar a linha superior.

### Configurar Motores de Busca e Sincronia
- **OpenSubtitles v3 (Ilimitado):** ativo por padrão sem chave de API.
- **Subtitle Sync (Opcional):** cole sua URL `https://subtitlesync.stream/.../manifest.json` (ou `stremio://...`) para priorizar faixas sincronizadas por frame.
- **OpenSubtitles REST API v1 (Opcional):** informe sua API Key para matching oficial por `moviehash`.
- Selecione o roteamento individual por idioma (`Auto`, `Sync` ou `OpenSub`) e clique em **Testar** para verificar conectividade.
- Mantenha **Auto-Sync + Anti-Flicker** ativo para ancoragem bidirecional, correção de drift de FPS e trava de `380ms` entre falas.

---

## 6. Como Selecionar as Legendas Dual no Player do Stremio

1. Inicie qualquer filme ou episódio no **Stremio Desktop**.
2. Abra o menu de legendas no **seu idioma** (ex.: `Português (Brasil)`) ou no **idioma de estudo** (ex.: `Inglês`).
3. Escolha uma faixa ranqueada (ex.: `Dual EN+PT-BR 1 (Sync/OS) · 96%`). Caso o release do vídeo difira do par `#1`, basta alternar para `Dual ... 2` ou `3`.
4. **Cores e tamanhos `.ASS`:** para exibir cores personalizadas, escala de fonte e caixa translúcida no Stremio Desktop, ative **Configurações › Reprodutor › Estilizar legendas ASS**.
5. **Tamanho nativo do Stremio (`.SRT`):** selecione a cor **Branco SRT** (com contorno padrão e fonte `46px`) para receber `.srt` limpo controlado pelos ajustes nativos do player.

---

## 7. Importação Local de SRT/VTT e Associação por `contentId` (API Companion)

A interface web prioriza a busca automática via provedores externos, mas o Companion mantém a API local autenticada (`127.0.0.1`) para upload de arquivos `.srt`/`.vtt` locais:

- **Endpoint:** `POST http://127.0.0.1:7000/companion/subtitles`
- **Cabeçalhos obrigatórios:** `Content-Type: application/json`, `X-SubtitleMe-Token: <token-da-meta-tag-em-/configure>` e `X-SubtitleMe-CSRF: 1`.
- **Associação por `contentId`:** informe o ID IMDb exato do conteúdo no Stremio:
  - Filme: `tt1254207`
  - Episódio de série: `tt0903747:1:2` (`imdbId:temporada:episódio`)
- **Exemplo de payload JSON:**
  ```json
  {
    "contentId": "tt1254207",
    "language": "en",
    "filename": "movie-en.srt",
    "content": "1\n00:00:01,000 --> 00:00:04,000\nHello world.\n"
  }
  ```

---

## 8. Como Encerrar o Companion

Na janela do terminal onde o Companion foi iniciado, pressione **`Ctrl + C`**. O servidor executa encerramento gracioso (`SIGINT`/`SIGTERM`), fecha a porta `127.0.0.1:7000` e limpa o cache temporário de legendas em memória.

---

## 9. Limitações Conhecidas

- **Exclusivo `127.0.0.1`:** por segurança, o servidor não aceita conexões externas; **Android, Android TV, Smart TVs e iOS não são suportados**.
- **Persistência opt-in sem criptografia em repouso:** quando `SUBTITLEME_PERSISTENCE=1` é ativado, `settings.json`, `providers.json` e legendas locais ficam gravados no perfil do usuário sem criptografia em repouso (`encryptedAtRest: false`).
- **Stremio Web (`https://web.stremio.com`):** requer navegador no mesmo computador com suporte a Private Network Access (PNA) para `http://127.0.0.1`.

---

## 10. Solução de Problemas Comuns

| Sintoma | Causa Provável | Solução |
| :--- | :--- | :--- |
| **Porta `7000` em uso** | Outro processo ocupando `127.0.0.1:7000` | Defina `set PORT=7001` antes de rodar `.\bin\start-companion.cmd` e atualize a URL no Stremio. |
| **Cores `.ASS` não aparecem no Stremio** | Opção de estilo ASS desativada no player | No Stremio Desktop, ative **Configurações › Reprodutor › Estilizar legendas ASS**. |
| **Erro de `ExecutionPolicy` no PowerShell** | Política padrão restrita do Windows | Use `.\bin\start-companion.cmd` ou `node .\dist\index.mjs`. |
| **Legenda fora de sincronia em um filme** | Release do vídeo diferente da 1ª opção | Selecione `Dual ... 2` ou `3` no menu de legendas do Stremio, ou conecte o **Subtitle Sync** em `/configure`. |
| **Aviso `"sem legendas em <idioma>"`** | Fonte selecionada não possui aquele idioma para o título | Mude a fonte do idioma para **Auto** em `/configure` e verifique se **OpenSubtitles v3** está ativo. |
