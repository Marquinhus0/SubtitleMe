# Guia de Utilização — SubtitleMe Stremio Addon (`v1.0.0`)

Este guia descreve como configurar e usar todos os recursos efetivamente disponíveis na versão **`1.0.0`** do SubtitleMe para Stremio Desktop.

---

## 1. Primeira inicialização

1. Inicie o Local Companion no computador onde o Stremio Desktop está instalado (veja [docs/INSTALLATION.md](./INSTALLATION.md)):
   - **Windows:** `.\bin\start-companion.cmd`
   - **Linux:** `./bin/start-companion.sh`
2. Abra **`http://127.0.0.1:7000/configure`** no navegador para acessar o **SubtitleMe Studio**.
3. Confirme que o Companion está ativo em `127.0.0.1:7000` e clique em **Instalar no Stremio** (ou cole `http://127.0.0.1:7000/manifest.json` em **Stremio Desktop → Complementos → + Adicionar Complemento**).
4. **Instale apenas uma vez:** qualquer mudança feita depois no SubtitleMe Studio é salva no `RuntimeSettingsStore` e aplicada em tempo real na próxima consulta do player, sem precisar reinstalar o addon.

---

## 2. Configuração dos idiomas (37 idiomas suportados)

No painel **SubtitleMe Studio** (`/configure`):

- **Estou aprendendo (Idioma Primário):** idioma principal de estudo (padrão: `Inglês` / `en`).
- **Meu idioma (Idioma Secundário):** idioma de apoio/tradução (padrão: `Português (Brasil)` / `pt-BR`).
- Os dois idiomas devem ser **diferentes** (selecionar idiomas idênticos é rejeitado pela validação).
- **Ordem vertical:** escolha se o idioma de estudo fica no topo (`primary-top`) ou se o seu idioma nativo fica no topo (`secondary-top`).

---

## 3. Pares ranqueados e seleção de opções Dual no player

- Em **Opções ranqueadas no Stremio**, escolha quantos pares combinados deseja receber por título (**`1` a `5` pares**).
- O SubtitleMe combina candidatos distintos por similaridade de release (`WEB-DL`, `BluRay`, grupo) e ordena os pares pela porcentagem real de sobreposição das falas.
- As faixas geradas são publicadas simultaneamente tanto sob o **seu idioma** quanto sob o **idioma de estudo** no menu de legendas do Stremio Desktop, com rótulo indicando origem e taxa de sobreposição (por exemplo: `Dual EN+PT-BR 1 (Sync/OS) · 96%`).
- **Dica prática:** se a opção `Dual ... 1` não corresponder ao release exato do vídeo que você está assistindo, basta alternar para `Dual ... 2` ou `3` diretamente no menu de legendas do player.

---

## 4. Fontes de legenda e roteamento por idioma

Você pode combinar fontes locais e externas opcionais:

- **Local Companion Store (prioridade máxima):** arquivos `.srt` ou `.vtt` enviados localmente para o `contentId` exato sempre têm prioridade sobre fontes externas e nunca são sobrescritos silenciosamente.
- **OpenSubtitles v3 (`opensubtitles-v3.strem.io`):** ativo por padrão sem necessidade de chave de API.
- **Subtitle Sync (Opcional):** cole sua URL `https://subtitlesync.stream/.../manifest.json` (ou `stremio://...`) em `/configure` para priorizar faixas sincronizadas por frame (faixas marcadas como `⚠️ Não sincronizada` são filtradas automaticamente).
- **OpenSubtitles REST API v1 (Opcional):** informe sua chave oficial de API em `/configure` (ou via `OPENSUBTITLES_ENABLED=1` + `OPENSUBTITLES_API_KEY`) para busca oficial com matching por `moviehash`.
- **Roteamento individual por idioma:** defina `Auto`, `Sync` ou `OpenSub` separadamente para o idioma primário e o secundário, e use o botão **Testar** para validar conectividade.

---

## 5. Importação local de `.SRT` e `.VTT` e associação por `contentId`

Quando quiser usar seus próprios arquivos locais `.srt` ou `.vtt` (até **5 MB** por arquivo):

- Os arquivos são associados **explicitamente** ao `contentId` do conteúdo — o SubtitleMe **nunca** usa o nome do arquivo como prova única de correspondência para evitar misturar legendas de episódios ou filmes diferentes.
- **Formatos de `contentId`:**
  - Filme IMDb: `tt1254207`
  - Episódio de série IMDb: `tt0903747:1:2` (`imdbId:temporada:episódio`)
  - Catálogos alternativos/customizados: `tmdb:10378`, `kitsu:7442:3` ou identificador explícito definido pelo usuário.
- **Via API local autenticada (`127.0.0.1`):**
  - `POST http://127.0.0.1:7000/companion/subtitles`
  - Cabeçalhos obrigatórios: `Content-Type: application/json`, `X-SubtitleMe-Token` (token da `<meta name="subtitleme-token">` em `/configure`) e `X-SubtitleMe-CSRF: 1`.
  - Remoção individual: `DELETE http://127.0.0.1:7000/companion/subtitles/:id` (invalida imediatamente as faixas combinadas derivadas no cache).

> **Lembrete:** por padrão o Companion opera em memória. Para manter arquivos locais e configurações salvos após reiniciar, inicie com `SUBTITLEME_PERSISTENCE=1` ou habilite a persistência local em `/configure`.

---

## 6. Ajustes de sincronização e Auto-Sync

- **Auto-Sync + Anti-Flicker (ativo por padrão):** realiza ancoragem bidirecional entre as duas legendas, aplica regressão linear para corrigir drift de FPS (`23.976` ↔ `24` ↔ `25`) e usa trava **anti-flicker de `380ms`** para alinhar micro-diferenças de início e fim no mesmo milissegundo.
- **Offsets manuais independentes:** ajuste o adiantamento ou atraso de cada idioma separadamente entre **`-30.000ms` e `+30.000ms`**.

---

## 7. Modo Reveal (`0s` a `2s`)

O **Modo Reveal** é voltado para estudo ativo de idiomas:

- Escolha um atraso de **`0s`** (desligado), **`0.5s`**, **`1s`**, **`1.5s`** ou **`2s`**.
- A legenda no idioma que você está aprendendo aparece imediatamente, enquanto a tradução surge após o atraso escolhido.
- Durante o intervalo de espera, o SubtitleMe reserva a altura exata da linha de tradução com espaço não-quebrável (`\u00A0`), evitando que a legenda superior "pule" verticalmente na tela.

---

## 8. Diferenças entre `.ASS`, `.SRT` (White SRT Mode) e `.VTT`

| Modo / Formato | Como ativar | Comportamento no Stremio Desktop |
| :--- | :--- | :--- |
| **`.ASS` Estilizado (padrão Studio)** | Selecionar cores personalizadas, escala de fonte (`28–68px`), estilo de fundo (`outline`, `box`, `clean`) ou posição vertical. | Entrega `.ass` com cores BGR, tamanhos e caixa translúcida. **Exige** ativar **Configurações › Reprodutor › Estilizar legendas ASS** no Stremio Desktop. |
| **Modo `Branco SRT` (`.SRT` limpo)** | Selecionar a cor **Branco SRT** (com contorno padrão e fonte `46px`). | Entrega `.srt` limpo sem tags `<font>`, permitindo controlar tamanho e aparência usando os controles nativos do próprio player do Stremio. |
| **`.VTT` (WebVTT clássico)** | Modo de compatibilidade clássico (`outputFormat: 'vtt'`). | Entrega WebVTT padrão com UTF-8 completo e posicionamento `line:XX%`, legível mesmo em players que ignoram CSS avançado. |

---

## 9. Solução rápida de problemas

- **Cores personalizadas não aparecem:** ative **Configurações › Reprodutor › Estilizar legendas ASS** no Stremio Desktop.
- **Nenhuma legenda retornada para um título:** confirme que o Companion está rodando em `127.0.0.1:7000`, mude o roteamento do idioma para **Auto** e verifique se **OpenSubtitles v3** está ativo ou se ambas as legendas locais foram associadas ao `contentId` exato.
- **Legenda atrasada ou adiantada:** tente o par `Dual ... 2` ou `3` no player, ative **Auto-Sync**, conecte o **Subtitle Sync** ou ajuste o offset manual em `/configure`.

Para mais perguntas e soluções detalhadas, consulte [docs/FAQ.md](./FAQ.md).
