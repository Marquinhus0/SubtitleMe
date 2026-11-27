# Privacy Policy — SubtitleMe Chrome Extension

**Last Updated:** 2026-11-27
**Applies to:** SubtitleMe Chrome Extension (Manifest V3)

---

## English (`en`)

### 1. Data Collection & Transmission
SubtitleMe is designed to operate **100% locally inside your browser**.
- We do **not** collect, transmit, store remotely, sell, or share any personal data, browsing history, viewing history, or subtitle files.
- SubtitleMe makes **zero** external network requests (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`), contains **no** analytics, **no** telemetry, and **no** advertising SDKs.

### 2. Local Storage
All user data stays strictly on your device:
- **Preferences (`chrome.storage.local`):** interface language, preferred subtitle languages, visual appearance settings, and timing offsets.
- **Imported Subtitles (`IndexedDB`):** `.srt` and `.vtt` files voluntarily selected by you are parsed and stored exclusively inside your browser's local `IndexedDB` (`subtitleme-local-subtitles`) and are never uploaded externally.
- You can delete all locally stored preferences and subtitles at any time via **Settings → Privacy → Clear All Data**.

### 3. Permissions & Page Access
SubtitleMe uses least-privilege Manifest V3 permissions:
- `storage`: saves your local preferences in `chrome.storage.local`.
- `activeTab` and `scripting`: inject the content script **only on demand** in the currently active tab when you interact with the extension, exclusively to detect compatible HTML5 `<video>` elements, read accessible `TextTrack` cues, and render the dual-subtitle Shadow DOM overlay.
- Content scripts do not read cookies, passwords, form inputs, or unrelated page content.

---

## Português (Brasil) (`pt-BR`)

### 1. Coleta e Transmissão de Dados
O SubtitleMe foi projetado para funcionar **100% localmente no seu navegador**.
- Não coletamos, transmitimos, armazenamos externamente, vendemos nem compartilhamos dados pessoais, histórico de navegação, histórico de vídeos ou arquivos de legenda.
- O SubtitleMe realiza **zero** requisições de rede externas (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`) e não contém telemetria, analytics ou anúncios.

### 2. Armazenamento Local
Todos os dados permanecem exclusivamente no seu dispositivo:
- **Preferências (`chrome.storage.local`):** idioma da interface, idiomas padrão, personalização visual e deslocamentos de sincronização.
- **Legendas Importadas (`IndexedDB`):** arquivos `.srt` e `.vtt` selecionados voluntariamente por você são processados e salvos exclusivamente no `IndexedDB` local (`subtitleme-local-subtitles`), nunca enviados para servidores externos.
- Você pode apagar todos os dados a qualquer momento em **Configurações → Privacidade → Limpar Todos os Dados**.

### 3. Permissões e Acesso às Páginas
- `storage`: salva suas preferências locais em `chrome.storage.local`.
- `activeTab` e `scripting`: injetam o content script **apenas sob demanda** na aba ativa quando você aciona a extensão, exclusivamente para detectar vídeos HTML5 compatíveis, ler faixas `TextTrack` acessíveis e exibir o overlay de legendas duplas em Shadow DOM.
- Os content scripts não leem cookies, senhas, formulários ou dados fora do player de vídeo.
