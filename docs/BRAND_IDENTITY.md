# SubtitleMe — Identidade Visual & Sistema de Design Definitivo

> **Tagline oficial:** `Two languages. One experience.`  
> **Posicionamento:** *Learn languages through entertainment — locally, privately, and free.*  
> **Versão do sistema:** 2.0 (Sprint 18.2.1 — Brand Identity & Visual System)

---

## 1. Auditoria Visual do Repositório Existente

A inspeção da base de código real identificou duas linhagens visuais que precisavam ser unificadas:

| Componente | Estado auditado no repositório | Decisão da Sprint 18.2.1 |
| :--- | :--- | :--- |
| **SubtitleMe Studio (`v1.0.0` GA)** — `apps/stremio-addon/src/configure/configure-page.ts` | Já utiliza **Obsidian-Emerald Dark** (`#070B09`, `#10B981`, `#34D399`, `#EEF4F1`, `#8FA399`), tipografia `Inter` e hairlines sutis. | **Adotado como base oficial da identidade definitiva** (preservado sem alterações na `v1.0.0`). |
| **Chrome Extension (`v1.0.0 RC`)** — `apps/chrome-extension/src/styles/theme.css` e `BrandLogo.vue` | Utiliza paleta legada (`#0B0D12`, roxo `#8B7CFF` + ciano `#36CFC9`) e ícone de 3 barras horizontais em squircle (`16/32/48/128px`). | **Não modificado nesta sprint** (regra de governança). O DNA geométrico das barras horizontais evolui para a Proposta A em Emerald/Mint para unificação futura (`v1.1`). |
| **Stremio Manifest (`v1.0.0` GA)** — `apps/stremio-addon/src/addon/manifest.ts` | Define `name: "SubtitleMe"` e tagline `"Two languages. One experience."` sem URL externa de ícone (local-only). | Preservado intacto na `v1.0.0`. |

---

## 2. Três Propostas Conceituais de Logotipo

Todas as propostas foram construídas em vetor SVG ([`assets/brand/proposals/`](../assets/brand/proposals/)) e comparadas visualmente em [`assets/brand/proposals/logo-proposals-board.jpg`](../assets/brand/proposals/logo-proposals-board.jpg):

| Critério | **Proposta A — Dual Track Sync** *(Recomendada)* | **Proposta B — Split Cinema Frame** | **Proposta C — Interlocking Ribbon "S"** |
| :--- | :--- | :--- | :--- |
| **Arquivo SVG** | [`proposal-a-dual-track.svg`](../assets/brand/proposals/proposal-a-dual-track.svg) | [`proposal-b-cinema-frame.svg`](../assets/brand/proposals/proposal-b-cinema-frame.svg) | [`proposal-c-ribbon-s.svg`](../assets/brand/proposals/proposal-c-ribbon-s.svg) |
| **Conceito** | Duas barras horizontais escalonadas (Emerald `#10B981` + Mint `#34D399`) + linha sutil de sincronia (`#EEF4F1`) em squircle Obsidian (`#070B09`). | Moldura cinematográfica 16:9 em Emerald envolvendo duas linhas de diálogo (branco + Mint). | Monograma geométrico diagonal "S" formado por duas fitas paralelas entrelaçadas. |
| **Semântica de legendas** | **Excelente** — leitura imediata de duas faixas sincronizadas. | **Alta** — remete bem a vídeo/player. | **Média** — abstrata para novos usuários. |
| **Legibilidade em `16×16` px** | **Excelente** — formas largas e espaçadas continuam nítidas em favicon e toolbar. | **Média** — borda fina da moldura perde definição em `16px`. | **Boa** — diagonais exigem anti-aliasing cuidadoso em `16px`. |
| **Monocromático / Impressão** | **Excelente** — funciona perfeitamente em 1 cor. | **Boa** — depende de espessura de traço. | **Boa** — exige contraste entre planos. |
| **Continuidade com o produto** | **Máxima** — evolui o símbolo de barras do `BrandLogo.vue` para a paleta Obsidian + Emerald/Mint do Studio `v1.0.0`. | Parcial. | Parcial (ótima como arte secundária/banner). |

### Proposta Recomendada: **Proposta A — Dual Track Sync**

A **Proposta A** é recomendada como identidade principal definitiva porque:
1. Comunica instantaneamente o valor central (*duas legendas simultâneas em harmonia*) sem precisar de explicação textual.
2. Mantém legibilidade impecável do menor favicon (`16×16`) até banners `512×512` e GitHub Social Preview.
3. Unifica organicamente a linguagem visual já validada no **SubtitleMe Studio (`v1.0.0`)** com a estrutura de barras horizontais da **Extensão Chrome**, transmitindo qualidade premium e rigor técnico sem parecer um produto fechado/pago.

---

## 3. Versões Oficiais da Marca (Fundos Escuros e Claros)

| Versão | Fundo Escuro | Fundo Claro | Aplicação principal |
| :--- | :--- | :--- | :--- |
| **Horizontal (Principal)** | [`assets/brand/logo-primary.svg`](../assets/brand/logo-primary.svg) | [`assets/brand/logo-wordmark-dark.svg`](../assets/brand/logo-wordmark-dark.svg) | Navbar da landing page, README, documentação |
| **Vertical (Empilhada)** | [`assets/brand/logo-vertical-dark.svg`](../assets/brand/logo-vertical-dark.svg) | [`assets/brand/logo-vertical-light.svg`](../assets/brand/logo-vertical-light.svg) | Capas, apresentações, cards quadrados |
| **Símbolo (Ícone)** | [`assets/brand/icon-mark.svg`](../assets/brand/icon-mark.svg) | [`assets/brand/icon-mark-light.svg`](../assets/brand/icon-mark-light.svg) | Favicon, avatar GitHub, ícone de app/extensão |
| **Monocromática** | [`assets/brand/logo-monochrome.svg`](../assets/brand/logo-monochrome.svg) (`currentColor`) | [`assets/brand/logo-monochrome-dark.svg`](../assets/brand/logo-monochrome-dark.svg) (`#070B09`) | Marcas d'água, rodapés minimalistas, impressão |

### Pacote de Ícones Exportados (`assets/brand/icons/`)

Gerados em PNG de alta precisão a partir da Proposta A:
- `icon-16.png` (`16×16`) — favicon clássico / extensão Chrome
- `icon-32.png` (`32×32`) — favicon Retina / extensão Chrome
- `icon-48.png` (`48×48`) — gerenciamento de extensões / desktop
- `icon-128.png` (`128×128`) — Chrome Web Store / Stremio addon
- `apple-touch-icon-180.png` (`180×180`) — iOS / Safari bookmark
- `icon-192.png` (`192×192`) — Web App Manifest
- `icon-512.png` (`512×512`) — GitHub avatar, Open Graph e alta resolução

---

## 4. Paleta de Cores e Tokens (HEX + Tailwind CSS v4)

Arquivo canônico de tokens pronto para importação em Vue 3 + TypeScript + Tailwind CSS v4: [`assets/brand/design-tokens.css`](../assets/brand/design-tokens.css).

### Superfícies (Obsidian Dark & Light)

| Token Tailwind v4 | HEX | Aplicação |
| :--- | :--- | :--- |
| `--color-obsidian-950` | `#070B09` | Fundo principal (canvas) — alinhado ao Studio `v1.0.0` |
| `--color-obsidian-900` | `#0B0F0D` | Cards base, cabeçalho e rodapé |
| `--color-obsidian-800` | `#111815` | Superfícies elevadas, tabs ativas e painéis |
| `--color-obsidian-700` | `#17211D` | Estado hover de superfícies interativas |
| `--color-obsidian-border` | `#1E2B25` | Bordas sutis (1px hairline) |
| `--color-obsidian-border-strong` | `#2D4037` | Bordas em foco/hover e botões secundários |
| `--color-light-canvas` | `#FFFFFF` | Fundo principal para aplicações claras / documentação impressa |
| `--color-light-surface` | `#F8FAFC` | Cards e painéis em modo claro |

### Cores de Destaque (Emerald / Mint) e Semântica

| Token Tailwind v4 | HEX | Aplicação |
| :--- | :--- | :--- |
| `--color-emerald-600` | `#059669` | Hover de CTA primário e destaque sobre fundo claro (títulos/UI) |
| `--color-emerald-500` | `#10B981` | CTA primário, status ativo e faixa principal do ícone |
| `--color-mint-400` | `#34D399` | Legenda secundária bilíngue, links em fundo escuro e foco |
| `--color-mint-300` | `#6EE7B7` | Hover de links e micro-destaques |
| `--color-ink-primary` | `#EEF4F1` | Texto principal e legenda primária (Dark) |
| `--color-ink-secondary` | `#B4C4BC` | Texto corrido e descrições (Dark) |
| `--color-ink-muted` | `#8FA399` | Metadados e legendas auxiliares (Dark) |
| `--color-ink-on-accent` | `#04130D` | Texto sobre botões `#10B981` e `#34D399` |
| `--color-status-warning` | `#F59E0B` | Avisos de compatibilidade (ex.: macOS não validado) |
| `--color-status-danger` | `#F87171` | Estados de erro e alertas críticos |

### Auditoria Matemática de Contraste (WCAG 2.1)

| Combinação | Foreground | Background | Razão | Nível WCAG |
| :--- | :--- | :--- | :--- | :--- |
| Texto principal (Dark) | `#EEF4F1` | `#070B09` | **17.76 : 1** | **AAA** |
| Texto secundário (Dark) | `#B4C4BC` | `#070B09` | **10.90 : 1** | **AAA** |
| Texto muted (Dark) | `#8FA399` | `#070B09` | **7.42 : 1** | **AAA** |
| Mint 400 em Obsidian (links/legenda) | `#34D399` | `#070B09` | **10.30 : 1** | **AAA** |
| Emerald 500 em Obsidian | `#10B981` | `#070B09` | **7.80 : 1** | **AAA** |
| Texto CTA em Emerald 500 | `#04130D` | `#10B981` | **7.50 : 1** | **AAA** |
| Texto CTA em Mint 400 | `#04130D` | `#34D399` | **9.89 : 1** | **AAA** |
| Warning em Obsidian | `#F59E0B` | `#070B09` | **9.22 : 1** | **AAA** |
| Danger em Obsidian | `#F87171` | `#070B09` | **7.16 : 1** | **AAA** |
| Texto principal (Light) | `#070B09` | `#FFFFFF` | **19.80 : 1** | **AAA** |
| Texto secundário (Light) | `#334155` | `#FFFFFF` | **10.35 : 1** | **AAA** |
| Texto muted (Light) | `#475569` | `#FFFFFF` | **7.58 : 1** | **AAA** |
| Emerald 600 em Branco (UI / texto grande) | `#059669` | `#FFFFFF` | **3.77 : 1** | **AA-Large/UI** |

---

## 5. Tipografia, Espaçamentos, Bordas, Sombras e Raios

### Tipografia
- **Principal (Display & UI):** `Inter` / `Plus Jakarta Sans` (fallback: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
- **Secundária (Código, comandos, URLs `127.0.0.1` e SHA-256):** `JetBrains Mono` (fallback: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`).

| Estilo | Tamanho | Peso | Line-height | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| Display H1 | `clamp(2.25rem, 4.5vw, 3.5rem)` | `700` | `1.08` | `-0.03em` |
| Section H2 | `clamp(1.625rem, 3vw, 2.25rem)` | `700` | `1.18` | `-0.025em` |
| Card H3 | `1.125rem` (`18px`) | `600` | `1.35` | `-0.01em` |
| Body | `1rem` (`16px`) | `400` | `1.65` | `0` |
| Caption / Mono | `0.875rem` (`14px`) | `500` | `1.5` | `0` |

### Espaçamentos, Raios, Bordas e Sombras
- **Escala de espaçamento (base 4px):** `4px` (`--spacing-1`), `8px` (`-2`), `12px` (`-3`), `16px` (`-4`), `24px` (`-6`), `32px` (`-8`), `48px` (`-12`), `64px` (`-16`), `96px` (`-24`).
- **Border Radius:** `6px` (`sm` — inputs/badges), `10px` (`md` — botões/code blocks), `14px` (`lg` — cards), `20px` (`xl` — palcos de demonstração), `9999px` (`full` — pills de status).
- **Bordas:** `1px solid #1E2B25` (padrão) e `1px solid #2D4037` ou `rgba(52, 211, 153, 0.34)` (hover/ativo).
- **Sombras:** sutis e funcionais (`--shadow-sm: 0 1px 2px rgba(0,0,0,0.35)`, `--shadow-md: 0 8px 24px rgba(0,0,0,0.42)`, `--shadow-emerald-glow: 0 0 24px rgba(16,185,129,0.16)`).
- **Focus ring acessível:** `0 0 0 2px #070B09, 0 0 0 4px #34D399`.

---

## 6. Diretrizes de Uso da Marca

- **Área de proteção:** manter margem mínima equivalente à altura da barra Emerald superior do símbolo em todos os lados.
- **Tamanhos mínimos:** símbolo `16×16 px`; logo horizontal `140 px` de largura; logo vertical `120 px` de largura.
- **O que evitar:**
  - Não usar roxo/violeta como cor primária (substituído pelo sistema Obsidian + Emerald/Mint).
  - Não aplicar gradientes arco-íris sobre o wordmark nem sombras neon exageradas.
  - Não comunicar exclusividade paga (o acabamento é limpo e técnico, refletindo liberdade e acesso gratuito).
  - Não alterar proporções, cores ou espaçamento entre o símbolo e o wordmark.
