# SubtitleMe — Conteúdo Textual para Landing Page (`v1.0.0`)

> **Direção Visual de Referência (Apenas especificação editorial — nenhum site desenvolvido nesta sprint):**  
> - **Fundo:** Obsidian / Dark (`#07090D`, `#0B0D12`, superfícies `#11161F` com bordas finas `#1E293B`).  
> - **Acentos:** Emerald (`#10B981`) e Mint (`#34D399`).  
> - **Tipografia & Tom:** Minimalista, tecnológico, limpo e acessível — foco em clareza técnica sem exageros comerciais.

---

## 1. Hero Section

- **Badge:** `v1.0.0 · Local-First · Gratuito · Zero Telemetria`
- **Título (H1):** **Dois idiomas. Uma experiência.**
- **Subtítulo:** Assista a filmes e séries no Stremio Desktop com duas legendas simultâneas, sincronização inteligente e controle visual em tempo real — rodando 100% localmente no seu computador.
- **CTA Primário:** `Baixar SubtitleMe v1.0.0` *(link futuro para o pacote de distribuição)*
- **CTA Secundário:** `Ler Guia de Instalação` → `docs/INSTALLATION.md`
- **Microcopy de confiança:** Sem conta · Sem assinatura · Roda exclusivamente em `127.0.0.1`

---

## 2. Proposta de Valor

**Por que usar o SubtitleMe?**

O Stremio exibe apenas uma faixa de legenda por vez. O SubtitleMe elimina a troca manual entre idiomas combinando duas faixas em uma única legenda sincronizada, diretamente na sua máquina:

- **Aprenda no ritmo real:** leia o idioma que está estudando no topo com o apoio da tradução logo abaixo — ou ative o **Modo Reveal** para ver a tradução apenas `0.5s` a `2s` depois.
- **Sincronização que acompanha o vídeo:** ancoragem bidirecional, correção automática de drift de FPS e proteção anti-flicker (`380ms`) mantêm os dois idiomas alinhados.
- **Privacidade por arquitetura:** nenhum servidor remoto, nenhuma conta obrigatória e nenhuma exposição na rede local.

---

## 3. Como Funciona (3 Passos)

1. **Inicie o Local Companion**  
   Extraia o pacote standalone e execute `.\bin\start-companion.cmd` (Windows) ou `./bin/start-companion.sh` (Linux). O servidor sobe exclusivamente em `http://127.0.0.1:7000`.
2. **Configure no SubtitleMe Studio**  
   Abra `http://127.0.0.1:7000/configure`, escolha seus dois idiomas entre os 37 suportados, ajuste cores, tamanho ou Modo Reveal e clique em **Instalar no Stremio** (uma única vez).
3. **Escolha a faixa Dual no player**  
   Abra qualquer filme ou episódio no Stremio Desktop e selecione uma das opções ranqueadas (ex.: `Dual EN+PT-BR 1 · 96%`) diretamente no menu de legendas.

---

## 4. Funcionalidades Principais

- **37 Idiomas Suportados:** inglês, português (Brasil e Portugal), espanhol, francês, alemão, italiano, japonês, coreano, chinês, árabe, russo e mais 25 idiomas.
- **Multi-Par Ranqueado (`1` a `5` opções):** escolha entre até 5 pares combinados ordenados por sobreposição real e similaridade de release.
- **Modo Reveal (`0s` a `2s`):** atrase a tradução sem causar pulo vertical na linha principal (reserva de altura com `\u00A0`).
- **Auto-Sync + Anti-Flicker (`380ms`):** correção automática de drift de FPS + offsets manuais independentes de `-30.000ms` a `+30.000ms`.
- **`.ASS` Estilizado & Modo `Branco SRT`:** cores personalizadas, fonte de `28px` a `68px` e caixa translúcida em `.ASS`, ou `.SRT` limpo controlado nativamente pelo player.
- **Motor Multi-Fonte Flexível:** funciona com OpenSubtitles v3 (sem chave), Subtitle Sync (opcional), OpenSubtitles REST API v1 (opcional com sua chave) e arquivos `.srt`/`.vtt` locais via Companion.

---

## 5. Demonstração Conceitual do Fluxo

```text
[1] Você escolhe Inglês + Português (Brasil) no SubtitleMe Studio (127.0.0.1:7000/configure)
        │
[2] Stremio Desktop solicita legendas ao Companion local
        │
[3] SubtitleMe descobre os dois idiomas, aplica Auto-Sync + Anti-Flicker e combina em .ASS / .SRT / .VTT
        │
[4] Player exibe ambos os idiomas simultaneamente:
        ┌──────────────────────────────────────────────┐
        │   Hello! Welcome to SubtitleMe.              │  ← Idioma de estudo (Emerald / Branco)
        │   Olá! Bem-vindo ao SubtitleMe.              │  ← Tradução (Mint / Reveal opcional)
        └──────────────────────────────────────────────┘
```

---

## 6. Compatibilidade (Transparência Total)

- **Windows 11 X64 + Stremio Desktop `5.0.28` + Node.js `>= 22`:** plataforma principal validada na `v1.0.0`.
- **Linux (`./bin/start-companion.sh`):** parcialmente testado (validado até `1.0.0-rc.3`; não reexecutado na `v1.0.0`).
- **macOS:** ainda não validado (`Not Tested`).
- **Android, Android TV, Smart TVs e iOS:** não suportados na arquitetura loopback local `127.0.0.1`.

---

## 7. Privacidade e Segurança

- **Somente loopback (`127.0.0.1`):** `0.0.0.0` e conexões de rede local são bloqueados por código.
- **Zero telemetria e zero scraping:** nenhuma coleta de histórico de reprodução e nenhuma raspagem não autorizada.
- **Controles de segurança auditados:** token efêmero de sessão de 256 bits, proteção CSRF, defesa contra DNS Rebinding (`Host`) e validação estrita de `Origin`/CORS.
- **Persistência transparente:** modo memória por padrão; gravação local opt-in (`SUBTITLEME_PERSISTENCE=1`) com aviso claro de ausência de criptografia em repouso.

---

## 8. FAQ Resumido

- **Preciso criar uma conta?** Não. Tudo roda localmente no seu computador.
- **Preciso reinstalar o addon toda vez que mudar a cor ou o idioma?** Não. Instale uma vez e edite ao vivo em `http://127.0.0.1:7000/configure`.
- **Funciona na TV ou no celular?** Não. Por segurança, o Companion aceita apenas conexões locais em `127.0.0.1` no mesmo computador do Stremio Desktop.
- **Por que as cores não aparecem no Stremio?** Ative *Configurações › Reprodutor › Estilizar legendas ASS* no Stremio Desktop (ou use o modo *Branco SRT*).

---

## 9. Call to Action (CTA Final)

- **Título:** Pronto para assistir em dois idiomas no Stremio Desktop?
- **Texto:** Baixe o pacote standalone `v1.0.0`, inicie o Companion local em segundos e transforme cada filme ou série em prática real de idiomas.
- **Botão Primário:** `Baixar SubtitleMe v1.0.0`
- **Links de Apoio:** `Guia de Instalação` · `Guia de Utilização` · `Privacidade e Segurança` · `FAQ`
