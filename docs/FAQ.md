# Perguntas Frequentes e Troubleshooting (FAQ) — SubtitleMe (`v1.0.0`)

---

### 1. Por que o SubtitleMe não aparece no Stremio?
Verifique três pontos:
1. **O Local Companion precisa estar em execução** no mesmo computador antes de instalar ou usar o addon. Teste abrindo `http://127.0.0.1:7000/companion/health` no navegador — ele deve retornar `{"ok":true,...}`.
2. **O addon precisa estar instalado no Stremio Desktop:** vá em **Complementos → + Adicionar Complemento**, cole `http://127.0.0.1:7000/manifest.json` e confirme.
3. **Porta alternativa:** se você iniciou o Companion em outra porta (ex.: `PORT=7001`), a URL no Stremio deve usar a mesma porta (`http://127.0.0.1:7001/manifest.json`).

---

### 2. Por que não aparecem legendas no player?
- Confirme que o **Companion continua aberto** no terminal durante a reprodução.
- No painel **`http://127.0.0.1:7000/configure`**, verifique se pelo menos uma fonte está ativa (**OpenSubtitles v3** vem ativo por padrão) e se o roteamento de ambos os idiomas está em **Auto**.
- Clique em **Testar** em `/configure` para confirmar que o computador tem acesso às fontes externas configuradas.
- Se estiver usando apenas arquivos locais (sem fontes externas), confirme que **ambos** os idiomas (primário e secundário) foram enviados para o `contentId` exato do vídeo (ex.: `tt1254207` para filme ou `tt0903747:1:2` para episódio).

---

### 3. Por que preciso do Local Companion?
O protocolo de addons do Stremio exige um servidor HTTP que entregue o manifesto e os arquivos de legenda prontos ao player. Em vez de enviar seu histórico ou seus arquivos para um servidor na nuvem, o **Local Companion** roda esse servidor localmente em `127.0.0.1` no seu próprio computador — garantindo privacidade, aplicação ao vivo de configurações e suporte a arquivos locais sem backend remoto.

---

### 4. Preciso importar arquivos `.srt`/`.vtt` manualmente para cada vídeo?
**Não obrigatoriamente.** Na versão `1.0.0`, o **OpenSubtitles v3** já vem habilitado por padrão para buscar automaticamente legendas de filmes e séries, e você pode adicionar opcionalmente o **Subtitle Sync** ou a **OpenSubtitles REST API v1**. A importação manual de arquivos `.srt`/`.vtt` locais é um recurso opcional (via API local `/companion/subtitles`) para quando você já tem legendas próprias e quer prioridade máxima para elas.

---

### 5. Por que alguns conteúdos não encontram correspondência?
- O título pode não possuir legendas disponíveis nos **dois** idiomas selecionados nas fontes ativas.
- O **SubtitleMe** não faz associação aproximada baseada apenas no nome do arquivo e **nunca** mistura legendas de episódios diferentes (`S01E01` vs `S01E02`).
- Catálogos que não fornecem ID IMDb (`tt...`) não podem ser consultados na OpenSubtitles REST API v1 (que exige IMDb ID). Nesses casos, é possível fornecer legendas locais associadas ao `contentId` exato.

---

### 6. Por que preciso de duas legendas válidas?
O SubtitleMe só gera uma faixa bilíngue quando existem legendas válidas para **ambos** os idiomas configurados. Se faltar o idioma primário ou o secundário, o addon retorna lista vazia (`{"subtitles":[]}`) em vez de criar uma faixa bilíngue falsa ou duplicar o mesmo idioma.

---

### 7. Por que o addon não funciona no celular (Android/iOS) ou na Smart TV / Android TV?
Por decisão arquitetural de segurança, o Local Companion vincula-se **exclusivamente** a `127.0.0.1` (loopback da própria máquina) e bloqueia `0.0.0.0` e interfaces de rede local (LAN). Outros dispositivos da casa não conseguem (e não devem) acessar `127.0.0.1` do seu computador. Por isso, **Android, Android TV, Smart TVs e iOS não são suportados na `v1.0.0`**.

---

### 8. Como resolver problemas de conexão local (`127.0.0.1:7000`)?
- **Porta `7000` já ocupada:** encerre o outro processo ou inicie o Companion em outra porta:
  - Windows CMD: `set PORT=7001 && .\bin\start-companion.cmd`
  - Linux: `PORT=7001 ./bin/start-companion.sh`
- **Erro de `ExecutionPolicy` no PowerShell (Windows):** use `.\bin\start-companion.cmd` (recomendado) ou `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\bin\start-companion.ps1`.
- **Stremio Web (`https://web.stremio.com`):** exige navegador Chromium no mesmo computador com suporte a *Private Network Access (PNA)* para `http://127.0.0.1`. Para melhor experiência, utilize o **Stremio Desktop**.

---

### 9. O que fazer quando uma legenda está dessincronizada?
1. No menu de legendas do Stremio, experimente outro par ranqueado (`Dual ... 2` ou `Dual ... 3`), pois vídeos de releases diferentes (`WEB-DL` vs `BluRay`) podem ter cortes distintos.
2. Em `/configure`, verifique se **Auto-Sync + Anti-Flicker** está ativado.
3. Se usar **Subtitle Sync**, conecte sua URL em `/configure` para priorizar legendas sincronizadas por frame.
4. Para ajuste fino manual, configure os **offsets independentes** (`-30.000ms` a `+30.000ms`) para o idioma primário e/ou secundário em `/configure` e recarregue a legenda no player.

---

### 10. Por que as cores personalizadas (`.ASS`) não aparecem no Stremio Desktop?
No Stremio Desktop, abra **Configurações › Reprodutor** e ative a opção **Estilizar legendas ASS**. Caso prefira usar os controles nativos de tamanho do Stremio sem estilos `.ASS`, selecione a cor **Branco SRT** em `/configure`.

---

### 11. Como reiniciar o Companion (e manter minhas configurações)?
1. Na janela do terminal do Companion, pressione **`Ctrl + C`** para encerrar graciosamente.
2. Inicie novamente com `.\bin\start-companion.cmd` (Windows) ou `./bin/start-companion.sh` (Linux).
3. Se quiser preservar suas configurações, provedores e arquivos locais entre reinicializações, inicie com `SUBTITLEME_PERSISTENCE=1` (ou ative a persistência local em `/configure`). Caso o token de sessão expire após 12 horas ou seja revogado, basta recarregar a página `http://127.0.0.1:7000/configure`.
