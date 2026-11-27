# Changelog

All notable changes to SubtitleMe will be documented in this file.

## [1.0.1] — 2026-11-27

### SubtitleMe Stremio Addon (`@subtitleme/stremio-addon`) — Security Maintenance Release

#### Segurança (Remediação de Vulnerabilidades Transitivas de Produção)
- Eliminadas todas as **5 vulnerabilidades transitivas (`4 High`, `1 Low`)** na cadeia de `stremio-addon-sdk@1.6.10` via overrides escopados em `pnpm-workspace.yaml` e espelhados no `package.json` standalone gerado por `scripts/package-stremio-addon.mjs`:
  - `router > path-to-regexp` atualizado de `0.1.7` para **`0.1.13`** (`GHSA-9wv6-86v2-598j`, `GHSA-rhx6-c78j-4q9w`, `GHSA-37ch-88jc-xwx2` — unificado com `express@4.22.3`).
  - `external-editor > tmp` atualizado de `0.0.33` para **`0.2.7`** (`GHSA-ph9p-34f9-6g65`, `GHSA-52f5-9888-hmc6`).
- Validado **`0` vulnerabilidades de produção** tanto no monorepo (`pnpm audit --prod`) quanto no pacote standalone (`npm audit --omit=dev`).

#### Documentação & Versionamento
- Consolidado `docs/STREMIO_INSTALLATION.md` como redirecionamento canônico para `docs/INSTALLATION.md` e `apps/stremio-addon/QUICKSTART.md`, preservando o contexto histórico da fase Local MVP.
- Atualizada a versão do `@subtitleme/stremio-addon`, manifesto Stremio (`com.subtitleme.addon`), `User-Agent` (`SubtitleMe v1.0.1`), `QUICKSTART.md` e pacote standalone (`subtitleme-stremio-v1.0.1.tar.gz`).
- Sem novas funcionalidades e sem telemetria; extensão Chrome mantida independentemente em `1.0.0` RC.

---

## [1.0.0] — 2026-11-26

### SubtitleMe Stremio Addon (`@subtitleme/stremio-addon`) — General Availability (GA)

#### Principais Funcionalidades & Motor Multi-Fonte
- Descoberta automática de legendas combinando **Subtitle Sync** (`subtitlesync.stream`, filtrando automaticamente faixas marcadas como não sincronizadas), **Stremio OpenSubtitles v3** (ilimitado, sem chave de API), **OpenSubtitles REST API v1** (opt-in com chave do usuário, matching por `moviehash` e cache de downloads de 15 minutos) e biblioteca local do Companion.
- Matching determinístico de filmes (`tt...`) e episódios de séries (`tt...:temporada:episódio`) com pontuação de similaridade de release (`WEB-DL`, `BluRay`, grupo) e bloqueio de mistura entre episódios distintos.
- Empacotamento standalone independente do monorepo (`dist/release/subtitleme-stremio-v1.0.0.tar.gz`) contendo `package.json` sem `workspace:*`, dependências de produção, launchers (`start-companion.cmd`, `start-companion.ps1`, `start-companion.sh`) e `QUICKSTART.md`.

#### Suporte a 37 Idiomas
- Catálogo expandido para **37 idiomas** com suporte a códigos BCP-47, ISO 639-2 e aliases nativos do Stremio (`pob`, `por`, `eng`, `spa`, `fre`, `ger`, `ita`, `jpn`, `kor`, `chi`, `rus`, `tur`, `ara`, `dut`, `pol`, `swe`, `dan`, `nor`, `fin`, `gre`, `heb`, `hun`, `rum`, `cze`, `ukr`, `ind`, `vie`, `tha`, `hin`, `per`, `urd`, `bul`, `hrv`, `srp`, `slo`, `slv`, `may`).

#### Pares de Legendas Bilíngues & Roteamento por Idioma
- Geração de **1 a 5 pares distintos** ranqueados por sobreposição real das falas (`%`) e publicados simultaneamente sob o idioma nativo e o idioma de estudo no menu de legendas do Stremio.
- Roteamento individual de fonte por idioma (`Auto`, `Sync` ou `OpenSub`) para o idioma de estudo (`learnSrc`) e idioma nativo (`nativeSrc`).
- Faixa informativa amigável (`dual-notice`) quando um título não possui legendas disponíveis em um dos idiomas selecionados.

#### Sincronização, Ancoragem Bidirecional e Offsets
- Ancoragem bidirecional que identifica automaticamente qual idioma possui maior aderência ao vídeo (Subtitle Sync / `moviehash` / release) e alinha o idioma complementar por votação multi-escala de corte e regressão linear de drift de FPS (`23.976` ↔ `24` ↔ `25`).
- Proteção **anti-flicker (`380ms`)** encaixando início e fim das duas falas no mesmo milissegundo.
- Offsets manuais independentes para cada idioma (`±30.000ms`).

#### Modo Reveal (Aprendizado)
- Atraso configurável da linha do idioma nativo (`0s`, `0.5s`, `1s`, `1.5s`, `2s`) com reserva de altura por espaço não-quebrável (`\u00A0`), mantendo a linha principal fixa sem deslocamento vertical enquanto a tradução aparece.

#### Geração VTT, ASS e SRT
- **`.ASS` estilizado (`text/x-ssa`):** cores personalizadas (BGR), escala de fonte (`24–80px`), contorno cinema, caixa translúcida ou traço fino e 4 posições verticais (`bottom`, `raised`, `high`, `top`).
- **`.SRT` limpo (`application/x-subrip`):** entregue automaticamente no modo `Branco SRT` (sem tags `<font>`) para respeitar os controles nativos de tamanho do player Stremio.
- **`.VTT` clássico (`text/vtt`):** preservado no modo de compatibilidade padrão com posicionamento `line:XX%`.

#### Companion Local (`SubtitleMe Studio`)
- Interface web local (`/configure`) em tema escuro esmeralda minimalista com monitor widescreen interativo, diagnóstico ao vivo das fontes (`POST /companion/opensubtitles/test`) e aplicação instantânea em tempo real (`RuntimeSettingsStore`) sem precisar reinstalar o addon.
- API local autenticada para upload validado de arquivos `.srt`/`.vtt` (`POST /companion/subtitles`) e persistência em disco opt-in (`SUBTITLEME_PERSISTENCE=1`).

#### Segurança e Privacidade
- Binding exclusivo em `127.0.0.1` (rejeita `0.0.0.0`, `::` e IPs de LAN).
- Token efêmero de `256` bits (`timingSafeEqual`, TTL de `12h` e revogação via `POST /companion/session/revoke`), cabeçalho CSRF (`X-SubtitleMe-CSRF: 1`), proteção contra DNS rebinding por validação estrita de `Host` e validação de `Origin` loopback.
- Separação rigorosa de CORS/PNA (`Access-Control-Allow-Private-Network: true` e `*` restritos às rotas do protocolo Stremio; nunca em `/companion/*`).
- Proteção contra path traversal e symlinks (`O_NOFOLLOW` em POSIX / `lstatSync` + contenção de diretório no Windows), limites de tamanho (`5 MB` por arquivo, `20 MB` cache, `50 MB` disco), tokens opacos de `192` bits no cache isolado por sessão e zero vazamento de credenciais em respostas ou logs.

#### Requisitos e Limitações Conhecidas
- **Requisitos:** Node.js `>= 22.0.0`. Validado em **Windows 11 X64** (`Node.js v24.19.0`) com **Stremio Desktop `5.0.28`**.
- **Limitações:** Arquitetura exclusivamente local em `127.0.0.1` (**Android, Android TV, Smart TVs e iOS não suportados**); launcher Linux (`start-companion.sh`) validado até `rc.1` e não reexecutado na `1.0.0`; **macOS não testado**; persistência opt-in grava dados localmente sem criptografia em repouso (`encryptedAtRest: false`); cores/tamanhos `.ASS` exigem **Configurações › Reprodutor › Estilizar legendas ASS** ativado no Stremio Desktop.

---

## [1.0.0-rc] — 2026-11-23

### Sprint 08 — Release Candidate & Production Packaging
- Finalized Manifest V3 (`apps/chrome-extension/public/manifest.json`) with audited least-privilege permissions and consistent `1.0.0` metadata.
- Generated final 4×4 supersampled anti-aliased PNG icons (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`) aligned with `BrandLogo.vue`.
- Created reproducible release packaging pipeline (`scripts/package-release.mjs` / `pnpm package:release`) generating bit-for-bit identical `dist/release/subtitleme-chrome-v1.0.0.zip` and `dist/release/SHA256SUMS.txt`.
- Added extracted-ZIP installation verification in real Chromium (`pnpm test:release`) asserting zero uncaught page errors.
- Authored `docs/INSTALLATION.md`, `docs/STORE_LISTING.md` (`en` & `pt-BR`), `docs/RELEASE_NOTES.md`, and `docs/RELEASE_CHECKLIST.md`.

### Sprint 07 — Quality Assurance, Security & Performance
- Fixed critical Vue 3 reactive Proxy `DataCloneError` in `buildLocalSubtitleRecord()` discovered during real Chromium E2E IndexedDB import testing.
- Fixed WCAG 2.2 AA muted text contrast (`--sm-text-muted` raised from `#6C7385` to `#8991A5`, achieving `>= 4.97:1` on all dark surfaces) and added 200% zoom responsive width bounds to `popup/App.vue`.
- Hardened `OverlayManager.reconcileMountContainer()` with safe fallback to `document.body` on hostile container attachment failures.
- Expanded real Chromium MV3 E2E suite (`tests/e2e/chrome-extension.mjs`) with legally generated `sample-video.webm`, covering real playback, forward/backward seeking, `2x` speed, genuine `ended` clearing, SRT/VTT import + duplicate/invalid rejection, IndexedDB persistence across Popup reopen, 5-video scaling/cleanup, and `TextTrack.mode` restoration.
- Added `tests/unit/qa-resilience.test.ts` and formal audit reports: `docs/SECURITY_AUDIT.md`, `docs/ACCESSIBILITY_AUDIT.md`, and `docs/PERFORMANCE_AUDIT.md`.

### Sprint 06 — Browser & Player Integration
- Implemented `PlayerDetector` with debounced `MutationObserver` and candidate ranking (fullscreen, playback, visibility, dimensions, interaction, viewport) in `apps/chrome-extension/src/content/player-detector.ts`.
- Implemented `NativeSubtitleObserver` and `convertNativeTrackToSubtitleTrack()` with safe text normalization and non-destructive `TextTrack.mode` preservation & restoration.
- Upgraded `OverlayManager` with fullscreen subtree re-parenting, exit restoration, and non-destructive container positioning.
- Implemented `PlayerLifecycleManager` coordinating isolated multi-video sessions (`PlayerSessionRegistry`, `TrackManager`, `MediaSyncController`, `OverlayManager`, `NativeSubtitleObserver`) and idempotent content-script bootstrapping (`content/index.ts`).
- Implemented strongly typed, `requestId`-tracked Popup-to-Content-Script messaging (`messages.ts`, `tab-messaging.ts`) with `activeTab` + `chrome.scripting` on-demand injection and restricted-page handling.
- Upgraded `VideoStatus.vue` and `popup/App.vue` with live playing/paused/fullscreen/native/local status badges and real-time local track push.
- Added controlled HTML5 test page (`tests/fixtures/html5-player.html`), `tests/integration/player-integration.test.ts`, and real Google Chrome MV3 Playwright harness (`tests/e2e/chrome-extension.mjs`).

### Sprint 05 — Local Files & Persistence
- Implemented versioned IndexedDB `LocalSubtitleRepository` (`subtitleme-local-subtitles` v1) with CRUD, unique `contentHash` duplicate prevention, storage usage reporting, typed `SubtitleStorageError` handling, and in-memory fallback in `@subtitleme/subtitle-storage`.
- Added encoding detection & normalization (`decodeSubtitleBytes`) in `@subtitleme/subtitle-parser` supporting UTF-8, UTF-8/UTF-16 BOM, and Windows-1252 fallback with user warnings.
- Implemented validated import pipeline (`subtitle-import.ts`) with oversize-before-read rejection, content format verification, preview generation, and explicit user confirmation in `FileImporter.vue`.
- Connected `subtitle.store.ts`, Popup, and Settings Local Files section to IndexedDB persistence and `TrackManager` (`track-bridge.ts`) with separated persistent/runtime track identity, inline cue preview, language assignment, and confirmed deletion controls.
- Added unit and integration tests using `fake-indexeddb` covering repository CRUD, restart persistence, encoding fallback, import validation, and end-to-end rendering.

### Sprint 04 — Dual Subtitle Engine
- Implemented `CueIndex` (O(log n) binary search with prefix-max pruning for overlapping cues and `[start, end)` half-open interval policy) and `TrackManager` in `@subtitleme/subtitle-core`.
- Implemented boundary-union `SubtitleMerger` and `serializeSubtitleCues()` (SRT/VTT) in `@subtitleme/subtitle-core` to support future Stremio Addon integration.
- Added `PlayerSessionRegistry` for isolated multi-player lifecycle management.
- Implemented browser-independent `SyncEngine` and isolated `requestAnimationFrame` `MediaSyncController` in `@subtitleme/subtitle-sync` with pause/resume/seek/playbackRate/ended handling and update deduplication.
- Implemented `createShadowSubtitleRenderer()` in `@subtitleme/subtitle-renderer` with Shadow DOM style isolation, safe `textContent` rendering, node/style caching, resize/fullscreen handling, and connected `OverlayManager` in the content script.
- Added unit and integration tests for core, sync, renderer, and full dual-subtitle pipeline.

### Sprint 03 — Subtitle Parsing
- Implemented complete browser-independent SubRip (`.srt`) and WebVTT (`.vtt`) parsing engine in `@subtitleme/subtitle-parser`.
- Added integer-millisecond timestamp utilities (`parseSrtTimestamp`, `parseVttTimestamp`, `normalizeTimestamp`, `formatTimestamp`) with strict bounds validation and zero-duration policy.
- Added safe text normalizer handling UTF-8 BOM, LF/CRLF/CR line endings, formatting tag stripping, `<script>`/`<style>` payload removal, HTML entity decoding, and Unicode preservation.
- Added structured diagnostics (`SubtitleDiagnosticCode`, severity, line/cue index), cue validation preserving valid overlaps, and automatic format detection via `parseSubtitle()`.
- Added 18 deterministic SRT/VTT test fixtures under `tests/fixtures/` and comprehensive unit + 5,000-cue performance tests.

### Sprint 02 — Design System
- Established Modern Dark design system tokens (`theme.css`) and reusable component classes (`global.css`) with WCAG-aligned focus states and `prefers-reduced-motion` support.
- Implemented typed `en` and `pt-BR` localization (`src/i18n/`) with compiler-enforced key parity and immediate reactive switching across the entire UI.
- Implemented pure runtime settings validation (`validateSettings`, `sanitizeSettings`) in `@subtitleme/shared-types` and browser-agnostic `SettingsRepository` in `@subtitleme/subtitle-storage`.
- Built isolated Chrome Storage service (`src/services/settings-storage.ts`) with cross-view `chrome.storage.onChanged` synchronization and non-crashing error handling.
- Built reusable accessible Vue components: `BrandLogo`, `ToggleSwitch`, `RangeSlider`, `SubtitlePreview`, `LanguageSelector`, `SubtitleControls`, `FileImporter`, and `VideoStatus`.
- Implemented the complete Chrome Popup interface and 8-section Settings page (General, Languages, Appearance, Synchronization, Local Files, Keyboard Shortcuts, Privacy, About) with live dual-subtitle preview.
- Added unit and component tests covering settings defaults, validation, persistence, reset, localization switching, and Vue component/page rendering.

### Sprint 01 — Foundation
- Initialized pnpm workspace monorepo (`apps/chrome-extension` and 6 shared packages under `packages/`).
- Configured strict TypeScript (`tsconfig.base.json`), ESLint flat config (TypeScript + Vue 3), Tailwind CSS v4, Pinia, Vite dual-build (extension pages + IIFE content script), and Vitest.
- Created least-privilege Chrome Extensions Manifest V3 configuration and placeholder PNG icons (`16`, `32`, `48`, `128`).
- Defined shared domain contracts in `@subtitleme/shared-types`, `@subtitleme/subtitle-parser`, `@subtitleme/subtitle-core`, `@subtitleme/subtitle-sync`, `@subtitleme/subtitle-renderer`, and `@subtitleme/subtitle-storage`.
- Added initial unit tests (`tests/unit/foundation.test.ts`) and core project documentation under `docs/`.
