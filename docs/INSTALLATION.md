# Guia de Instalação — SubtitleMe (`v1.0.0`)

Este guia cobre a instalação do **SubtitleMe Stremio Addon (`v1.0.0`)** a partir do pacote standalone `subtitleme-stremio-v1.0.0.tar.gz` (com instruções separadas por sistema operacional) e preserva as instruções da **Extensão Chrome (`v1.0.0 RC`)** ao final.

---

## 1. Windows (Plataforma Principal Validada)

Ambiente validado na `v1.0.0`: **Windows 11 X64**, **Node.js `v24.19.0`** (requisito mínimo: `>= 22.0.0`) e **Stremio Desktop `5.0.28`**.

### 1.1 Requisitos
- **Node.js `>= 22.0.0`** instalado e disponível no `PATH` (`node --version`).
- **Stremio Desktop** instalado no mesmo computador.
- O pacote standalone `subtitleme-stremio-v1.0.0.tar.gz` já inclui todas as dependências de produção (`node_modules/`), não exigindo `npm install` nem Docker.

### 1.2 Extração do pacote (e verificação opcional de integridade)
No Prompt de Comando ou PowerShell:

```powershell
# Opcional: verificar integridade SHA-256
Get-FileHash -Algorithm SHA256 .\subtitleme-stremio-v1.0.0.tar.gz
# Esperado: 7F298F2B792615EC8AE476FDF7D8E0AC35FA4AE494D25D945AD74313913261FD

mkdir subtitleme-stremio
tar -xzf subtitleme-stremio-v1.0.0.tar.gz -C subtitleme-stremio
cd subtitleme-stremio
```

### 1.3 Inicialização via CMD (Recomendado)
Não exige alteração de `ExecutionPolicy` do PowerShell:

```cmd
.\bin\start-companion.cmd
```

Para ativar a persistência local opcional (mantém configurações e arquivos salvos em `%USERPROFILE%\.subtitleme\stremio-companion` entre reinicializações):

```cmd
set SUBTITLEME_PERSISTENCE=1
.\bin\start-companion.cmd
```

Para usar uma porta alternativa caso a `7000` esteja ocupada:

```cmd
set PORT=7001
.\bin\start-companion.cmd
```

### 1.4 Inicialização via PowerShell (Alternativa)
Se a política padrão do Windows (`ExecutionPolicy=Restricted`) bloquear scripts `.ps1`, execute com bypass limitado apenas ao processo atual (sem alterar a política global do sistema):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\bin\start-companion.ps1
```

Ou execute diretamente com Node.js:

```powershell
node .\dist\index.mjs
```

### 1.5 Configuração do Companion e instalação no Stremio Desktop
1. Com o terminal aberto e o Companion ativo, acesse no navegador: **`http://127.0.0.1:7000/configure`**
2. Selecione seus idiomas (ex.: **Inglês** + **Português (Brasil)**) e ajuste as opções desejadas no **SubtitleMe Studio**.
3. Clique em **Instalar no Stremio**, ou copie **`http://127.0.0.1:7000/manifest.json`** e cole em **Stremio Desktop → Complementos → + Adicionar Complemento**.
4. Instale o addon apenas **uma vez** — alterações posteriores em `/configure` são aplicadas ao vivo sem precisar reinstalar.

### 1.6 Verificação de funcionamento
- `http://127.0.0.1:7000/companion/health` deve retornar `{"ok":true,"service":"subtitleme-local-companion","host":"127.0.0.1","localOnly":true,...}`.
- `http://127.0.0.1:7000/manifest.json` deve retornar o manifesto JSON com `"id":"com.subtitleme.addon"` e `"version":"1.0.0"`.
- No Stremio Desktop, reproduza um filme ou episódio e confirme a presença de faixas `Dual ...` no menu de legendas.

### 1.7 Encerramento
Na janela do terminal onde o Companion está rodando, pressione **`Ctrl + C`**. O servidor executa encerramento gracioso (`SIGINT`), libera a porta `127.0.0.1:7000` e limpa o cache temporário em memória.

---

## 2. Linux (`Partially Tested`)

> **Nota de compatibilidade:** O launcher `./bin/start-companion.sh` e a execução nativa em Linux foram validados em versões RC anteriores (`1.0.0-rc.1` a `1.0.0-rc.3` em Linux X64 com Node.js `v22.23.5`), porém **não foram reexecutados na `v1.0.0` final** e o **Stremio Desktop no Linux não foi testado visualmente**.

### 2.1 Requisitos
- **Node.js `>= 22.0.0`** (`node --version`).
- **Stremio Desktop** no mesmo computador.

### 2.2 Extração, permissões e inicialização
```bash
mkdir -p subtitleme-stremio
tar -xzf subtitleme-stremio-v1.0.0.tar.gz -C subtitleme-stremio
cd subtitleme-stremio
chmod +x ./bin/start-companion.sh
./bin/start-companion.sh
```

Com persistência local opcional (`~/.subtitleme/stremio-companion`, diretório `0700` e arquivos `0600`):

```bash
SUBTITLEME_PERSISTENCE=1 PORT=7000 ./bin/start-companion.sh
```

### 2.3 Configuração, verificação e encerramento
- Abra **`http://127.0.0.1:7000/configure`** no navegador.
- Verifique `curl http://127.0.0.1:7000/companion/health` e `curl http://127.0.0.1:7000/manifest.json`.
- Instale `http://127.0.0.1:7000/manifest.json` no Stremio Desktop (**Complementos → + Adicionar Complemento**).
- Para encerrar graciosamente (`SIGINT`/`SIGTERM`), pressione **`Ctrl + C`** no terminal.

---

## 3. macOS (`Não Validado`)

**O macOS não foi validado nem testado em nenhuma etapa da release `v1.0.0`.**

Por política de transparência do projeto, não fornecemos instruções de instalação para macOS como se houvesse compatibilidade confirmada. O pacote inclui um script POSIX (`./bin/start-companion.sh`), mas o suporte oficial a macOS permanece **não declarado (`Not Tested`)**.

---

## 4. Extensão Chrome SubtitleMe (`v1.0.0 RC` — Produto Independente)

A extensão Chrome opera de forma totalmente independente do Stremio Addon (não compartilha arquivos do IndexedDB com o Stremio):

1. Extraia `dist/release/subtitleme-chrome-v1.0.0.zip` (ou execute `pnpm install && pnpm build` no monorepo para gerar `apps/chrome-extension/dist/`).
2. Abra `chrome://extensions` no Google Chrome.
3. Ative o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta extraída (ou `apps/chrome-extension/dist/`).
5. Fixe o ícone do **SubtitleMe** na barra do navegador e abra qualquer página com player HTML5 compatível.
