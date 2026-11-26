# SubtitleMe — Comunicação Oficial e Materiais de Divulgação

> **Release alvo:** SubtitleMe Stremio Addon `v1.0.0` GA  
> **Tagline:** `Two languages. One experience.`  
> **Posicionamento:** *Learn languages through entertainment — locally, privately, and free.*  
> **Marca oficial:** `Dual Track Sync` (Obsidian `#070B09` · Emerald `#10B981` · Mint `#34D399`)

---

## 1. Descrição Curta (GitHub About / Meta Description / Bio)

- **Português:** Legendas bilíngues simultâneas para o Stremio Desktop — 100% local (`127.0.0.1`), 37 idiomas, gratuito e sem telemetria.
- **English:** Simultaneous dual-language subtitles for Stremio Desktop — local-first (`127.0.0.1`), 37 languages, free, and zero telemetry.

---

## 2. Descrição Completa (Diretórios, Release Notes e Apresentações)

O **SubtitleMe** transforma o consumo cotidiano de filmes e séries em uma experiência natural de aprendizado de idiomas. Como o player do Stremio Desktop exibe apenas uma faixa de legenda por vez, o **SubtitleMe Local Companion** executa localmente no seu próprio computador (`127.0.0.1:7000`), combina duas legendas de idiomas diferentes com sincronização inteligente e entrega uma única faixa bilíngue pronta para o player.

Na versão **`v1.0.0` GA**, o SubtitleMe oferece:
- **37 idiomas suportados** (BCP-47, ISO 639-2 e aliases nativos do Stremio).
- **1 a 5 pares bilíngues ranqueados** diretamente no menu de legendas do player.
- **Importação local (`.srt`/`.vtt`)** com prioridade máxima + integração opcional com provedores de legendas (OpenSubtitles v3 padrão sem chave, Subtitle Sync opcional e OpenSubtitles REST API v1 opcional).
- **Auto-Sync + trava anti-flicker (`380ms`)** e **Modo Reveal (`0s` a `2s`)** que atrasa a tradução sem mover a legenda principal.
- **Formatos adaptativos (`ASS`, `SRT` e `VTT`)** configuráveis ao vivo pelo **SubtitleMe Studio** (`http://127.0.0.1:7000/configure`).

---

## 3. Texto de Lançamento (`v1.0.0` GA)

> **Importante:** Todos os textos declaram com transparência que a `v1.0.0` foi validada ponta a ponta no **Windows 11 X64 + Stremio Desktop 5.0.28**, com CLI validado em **Linux**, **macOS não validado**, **mobile/TV não suportados** e **Extensão Chrome ainda em `v1.0.0 RC` (não promovida a GA)**.

### GitHub Release (`v1.0.0`)

```markdown
# SubtitleMe Stremio Addon v1.0.0 — Two languages. One experience.

Learn languages through entertainment — locally, privately, and free.

Primeira versão estável (GA) do **SubtitleMe Stremio Addon**: legendas bilíngues simultâneas para o **Stremio Desktop**, executadas 100% localmente em `127.0.0.1`, sem contas, sem assinaturas e sem telemetria.

## Destaques da v1.0.0
- 37 idiomas suportados e 1 a 5 opções bilíngues ranqueadas no menu do player.
- Importação local de `.srt`/`.vtt` + OpenSubtitles v3 (padrão sem API key), Subtitle Sync (opcional) e OpenSubtitles REST API v1 (opcional).
- Auto-Sync, trava anti-flicker (`380ms`), offsets independentes e Modo Reveal (`0s–2s`).
- SubtitleMe Studio (`http://127.0.0.1:7000/configure`) com aplicação ao vivo em ASS, Branco SRT ou VTT.

## Compatibilidade validada
- Windows 11 X64 + Stremio Desktop 5.0.28 + Node.js 22+: Validado ponta a ponta.
- Linux (x64, Node.js 22+): Instalação limpa do Companion CLI validada (player Linux Desktop não validado visualmente).
- macOS: Não validado.
- Android / Android TV / iOS / Smart TVs: Não suportados (arquitetura exclusiva `127.0.0.1`).

## Pacote Oficial
- Arquivo: `subtitleme-stremio-v1.0.0.tar.gz`
- SHA-256: `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`
```

---

## 4. Texto Explicativo sobre Privacidade

O SubtitleMe segue arquitetura **local-first**: o Companion vincula-se exclusivamente ao endereço loopback `127.0.0.1`, recusando exposição à rede local (`0.0.0.0` ou `::`), e aplica proteção contra DNS Rebinding e CSRF (validação estrita de `Host`/`Origin`, token efêmero de sessão de `256` bits com TTL de `12h` e cabeçalho `X-SubtitleMe-CSRF: 1`).

Não há contas de usuário, não há analytics, não há scraping de páginas web e arquivos `.srt`/`.vtt` enviados localmente jamais saem da sua máquina. Quando provedores externos oficiais estão habilitados pelo usuário, apenas o identificador do título/episódio é consultado para localizar faixas compatíveis. Por padrão, tudo permanece em memória e expira automaticamente; a persistência local em disco é estritamente opt-in (`SUBTITLEME_PERSISTENCE=1`).

---

## 5. Texto de Apoio Voluntário

O SubtitleMe é gratuito e livre de paywalls. Caso deseje apoiar a manutenção independente do projeto, há opções de contribuição voluntária em plataformas externas oficiais (detalhadas em [`docs/SUPPORT_AND_DONATIONS.md`](SUPPORT_AND_DONATIONS.md)). Nenhuma funcionalidade é bloqueada para quem não contribui e nenhum dado financeiro é coletado ou armazenado pelo SubtitleMe.

---

## 6. Inventário Oficial de Materiais Visuais (`Dual Track Sync`)

| Material | Arquivo | Dimensões | Uso |
| :--- | :--- | :--- | :--- |
| GitHub Social Preview | [`assets/marketing/github-social-preview.png`](../assets/marketing/github-social-preview.png) | `1280×640` | GitHub *Settings → Social preview* e Open Graph |
| Banner oficial | [`assets/marketing/official-banner.png`](../assets/marketing/official-banner.png) | `1600×500` | Cabeçalho de README, Release e apresentações |
| Captura real do produto (`v1.0.0`) | [`assets/marketing/studio-real-screenshot.png`](../assets/marketing/studio-real-screenshot.png) | `1280×800` | Demonstração real do SubtitleMe Studio |
| Apresentação da experiência bilíngue | [`assets/marketing/bilingual-experience-showcase.png`](../assets/marketing/bilingual-experience-showcase.png) | `1280×720` | Divulgação da leitura simultânea em dois idiomas |
| Card promocional da landing page | [`assets/marketing/landing-promo-card.png`](../assets/marketing/landing-promo-card.png) | `1200×630` | Compartilhamento social e apresentação da landing page |
| Prancha de aplicações da marca | [`assets/marketing/brand-applications-sheet.png`](../assets/marketing/brand-applications-sheet.png) | `1600×900` | Identidade Dual Track Sync em fundo escuro, claro, mono e ícones |
| Screenshots da landing page | [`docs/screenshots/landing-desktop-hero.png`](screenshots/landing-desktop-hero.png) · [`landing-mobile-hero.png`](screenshots/landing-mobile-hero.png) | `1440×900` / `390×844` | Evidência responsiva desktop e mobile |
