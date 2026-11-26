# SubtitleMe — Posicionamento e Branding (Sprint 18.1)

---

## 1. Avaliação do Posicionamento Base

- **Posicionamento avaliado:** *"Learn languages through entertainment."*
- **Análise:** É claro, memorável e comunica imediatamente o principal caso de uso (estudantes de idiomas). Contudo, usado isoladamente, pode soar como mais um app genérico de cursos/flashcards (competindo diretamente com Duolingo/Lingopie) e deixar de destacar o maior diferencial técnico do SubtitleMe: **rodar localmente no Stremio Desktop com privacidade real e zero assinatura**.
- **Recomendação:** Combinar o benefício emocional/educacional com a credencial técnica **local-first**:
  - **Posicionamento principal:** *"Aprenda idiomas com os filmes e séries que você já ama — com legendas bilíngues sincronizadas, 100% locais e gratuitas."*

---

## 2. Arquitetura de Mensagem

| Elemento | Definição Recomendada |
| :--- | :--- |
| **Tagline oficial** | **Two languages. One experience.** *(preservada)* |
| **Subtítulo / Posicionamento** | **Learn languages through entertainment — locally, privately, and free.** |
| **Proposta de valor** | Exibe dois idiomas simultâneos no Stremio Desktop com sincronização inteligente, Modo Reveal, 37 idiomas e personalização ao vivo — rodando localmente em `127.0.0.1`, sem contas nem telemetria. |
| **Mensagem central** | Transforme qualquer filme ou série em imersão bilíngue real, no seu ritmo e com controle total sobre seus dados. |
| **Pilares diferenciais** | 1) **Bilingual Sync & Reveal** (`Auto-Sync`, anti-flicker `380ms`, `Reveal 0s–2s`, `1–5` pares ranqueados) · 2) **Local-First Privacy** (`127.0.0.1`, zero conta, zero telemetria) · 3) **Live Studio Control** (37 idiomas, `.ASS` estilizado ou `Branco SRT`, edição sem reinstalar). |

---

## 3. Identidade Visual e Tom de Voz

- **Paleta:** **Obsidian Dark** (`#07090D`, `#0B0D12`, superfícies `#11161F`), acentos **Emerald** (`#10B981`) e **Mint** (`#34D399`), tipografia limpa e minimalista.
- **Tom de voz:** Tecnológico, direto, transparente e acolhedor. Fala com clareza tanto com usuários técnicos quanto com estudantes de idiomas, sempre explicando *o que o software faz de verdade*.

---

## 4. Mensagens Proibidas ou Exageradas (Guardrails de Governança)

Para proteger a credibilidade da marca, **nunca utilizar**:
- *"Funciona em todos os dispositivos / Smart TV / Android / iOS"* (falso — `127.0.0.1` não suporta mobile/TV).
- *"Compatível com macOS"* (não validado).
- *"100% criptografado"* (falso — persistência local opt-in não possui criptografia em repouso).
- *"Sincronização perfeita garantida em 100% dos filmes"* (exagerado — depende da disponibilidade de legendas nas fontes).
- *"Extensão Chrome já disponível na Chrome Web Store"* (falso — extensão está em `1.0.0 RC`, ainda não publicada).
- *"Streaming gratuito de filmes"* (proibido — SubtitleMe é exclusivamente uma ferramenta de legendas).

---

## 5. Descrições Prontas para Uso

### Descrição curta (até ~140 caracteres)
> **SubtitleMe** — Two languages. One experience. Legendas bilíngues simultâneas, sincronizadas e 100% locais para Stremio Desktop (37 idiomas).

### Descrição longa
> O **SubtitleMe** permite acompanhar duas legendas em idiomas diferentes simultaneamente enquanto você assiste a filmes e séries no **Stremio Desktop**. Com suporte a **37 idiomas**, até **5 pares bilíngues ranqueados** por título, **Auto-Sync bidirecional com proteção anti-flicker (`380ms`)**, **Modo Reveal (`0s–2s`)** para praticar compreensão auditiva antes da tradução e personalização ao vivo em **`.ASS`** ou **`Branco SRT`**, o SubtitleMe roda localmente no seu computador (`127.0.0.1`) — sem contas na nuvem, sem assinaturas e sem telemetria.
