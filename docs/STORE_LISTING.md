# Chrome Web Store Listing — SubtitleMe v1.0.0

---

## English (`en`)

### Name
**SubtitleMe**

### Tagline
**Two languages. One experience.**

### Short Description (<= 132 characters)
Display two independent subtitle tracks simultaneously on compatible HTML5 video players with local .srt/.vtt import and full privacy.

### Detailed Description
SubtitleMe lets you watch compatible HTML5 videos with two subtitle tracks displayed simultaneously—ideal for language learners, bilingual households, and international viewers.

**Key Features**
- **Simultaneous Dual Subtitles**: Display primary and secondary subtitle tracks together with configurable vertical stacking order.
- **Native & Local Tracks**: Uses accessible HTML5 `TextTrack`s when exposed by the player, or lets you import your own `.srt` and `.vtt` files with an instant pre-save preview.
- **Independent Timing Offsets**: Fine-tune synchronization in milliseconds independently for each track without assuming identical timestamps.
- **Modern Dark Customization**: Customize font family, font size, primary and secondary colors, background opacity, outline, shadow, vertical position, and line spacing with a live preview.
- **Bilingual Interface**: Full UI available in English (`en`) and Portuguese — Brazil (`pt-BR`).
- **100% Local & Privacy-First**: No account, no backend, no analytics, and no external subtitle uploads. Settings stay in `chrome.storage.local` and imported subtitle files stay in your browser's IndexedDB.

**Known Limitations**
- Not all video players expose subtitles through the standard HTML5 `TextTrack` API; closed or canvas-based players may require importing local `.srt` or `.vtt` files.
- SubtitleMe never bypasses DRM or extracts protected media streams.
- Fullscreen overlays are supported on player container wrappers; bare `<video>`-element fullscreen has browser-imposed DOM limitations.

**Privacy**
- All settings and imported subtitle files are processed and stored strictly locally on your device.
- No subtitle files are ever uploaded externally.
- No telemetry, browsing history, or viewing history is collected.
- Least-privilege permissions (`storage`, `activeTab`, `scripting`, and optional user-granted host permissions).

---

## Português (Brasil) (`pt-BR`)

### Nome
**SubtitleMe**

### Tagline
**Dois idiomas. Uma experiência.**

### Descrição Curta (<= 132 caracteres)
Exiba duas legendas simultâneas em players de vídeo HTML5 compatíveis com importação local de .srt/.vtt e privacidade total.

### Descrição Completa
O SubtitleMe permite assistir a vídeos HTML5 compatíveis com duas faixas de legenda exibidas ao mesmo tempo — ideal para quem estuda idiomas, famílias bilíngues e espectadores de conteúdo internacional.

**Principais Recursos**
- **Legendas Duplas Simultâneas**: Exiba legendas principal e secundária juntas com ordem de empilhamento configurável.
- **Legendas Nativas e Arquivos Locais**: Utiliza faixas HTML5 (`TextTrack`) quando expostas pelo player ou permite importar arquivos `.srt` e `.vtt` com pré-visualização antes de salvar.
- **Sincronização Independente**: Ajuste o deslocamento de tempo em milissegundos de forma independente para cada faixa.
- **Personalização Modern Dark**: Ajuste fonte, tamanho, cores, opacidade de fundo, contorno, sombra, posição vertical e espaçamento entre linhas com prévia em tempo real.
- **Interface Bilíngue**: Disponível em Inglês (`en`) e Português (Brasil) (`pt-BR`).
- **100% Local e Privado**: Sem conta, sem backend, sem telemetria e sem envio externo de legendas. Tudo permanece salvo apenas no seu navegador (`chrome.storage.local` e IndexedDB).

**Limitações Conhecidas**
- Nem todos os players expõem legendas via API padrão HTML5 `TextTrack`; players fechados ou baseados em canvas podem exigir arquivos `.srt` ou `.vtt` locais.
- O SubtitleMe não contorna DRM nem extrai mídias protegidas.
- Overlays em tela cheia funcionam em containers do player; tela cheia diretamente no elemento `<video>` possui limitações impostas pelo próprio navegador.

**Privacidade**
- Todos os dados e arquivos de legenda são processados e armazenados apenas localmente no seu dispositivo.
- Nenhum arquivo de legenda é enviado para servidores externos.
- Nenhuma telemetria, histórico de navegação ou histórico de vídeos é coletado.
- Permissões de privilégio mínimo (`storage`, `activeTab`, `scripting` e permissões opcionais de host).
