# SubtitleMe — Roadmap de Lançamento (Sprint 18.1)

> **Regra de Escopo:** Nenhuma funcionalidade nova é adicionada à **`v1.0.0`**. Todos os itens de evolução funcional ficam explicitamente separados como **Pós-lançamento (`v1.1+`)**.

---

## 1. Linha do Tempo de Lançamento

| Fase | Escopo Principal | Status Atual |
| :--- | :--- | :--- |
| **Fase 1 — Preparação Operacional** | Documentação de onboarding (Sprints 17.2–17.3), definição de `LICENSE`, templates de Issue/Discussion no GitHub, commit/push da documentação aprovada | **Em andamento (aguardando decisões do mantenedor)** |
| **Fase 2 — Beta Fechado** | Distribuição controlada de `subtitleme-stremio-v1.0.0.tar.gz` para 10–25 testadores externos (Windows 11 + voluntários Linux), coleta estruturada de feedback de instalação e uso | **Pendente** |
| **Fase 3 — Beta Público** | GitHub Pre-Release/Release com `subtitleme-stremio-v1.0.0.tar.gz` + `.sha256` e divulgação em 1–2 comunidades selecionadas para validar escala do onboarding | **Pendente** |
| **Fase 4 — Lançamento Oficial (`v1.0.0` Público)** | GitHub Release pública `v1.0.0` + Landing Page estática (baseada em `docs/LANDING_PAGE_CONTENT.md`) + divulgação orgânica com vídeo curto de demonstração | **Pendente** |
| **Fase 5 — Pós-lançamento (`v1.1+` & Chrome Extension)** | Promoção e publicação da Chrome Extension na Chrome Web Store, instalador simplificado Windows, ampliação de compatibilidade e evolução guiada por feedback | **Planejado (Pós-1.0)** |

---

## 2. Classificação Clara de Trabalho

### A. Trabalho Obrigatório (Antes do Beta Fechado / Public Launch)
- Escolher e adicionar arquivo `LICENSE` na raiz do repositório.
- Autorizar commit e push da documentação das Sprints 17.2, 17.3 e 18.1 para `main`.
- Criar templates de GitHub Issues (`Bug Report`, `Onboarding/Instalação`, `Feature Request`) e ativar GitHub Discussions.
- Anexar o tarball oficial `subtitleme-stremio-v1.0.0.tar.gz` (`SHA-256: 7f298f2b...`) e `.sha256` ao criar a futura GitHub Release.

### B. Melhorias Recomendadas (Sem Alterar o Código da `v1.0.0`)
- Construir e hospedar a Landing Page estática (GitHub Pages gratuito) utilizando o conteúdo aprovado em `docs/LANDING_PAGE_CONTENT.md`.
- Gravar vídeo curto (45–60s) demonstrando a instalação em 1 clique + Modo Reveal + Dual `.ASS` no Stremio Desktop.
- Configurar canal de apoio voluntário (ex.: GitHub Sponsors / Ko-fi), se aprovado pelo mantenedor.

### C. Pendências de Compatibilidade (Honestamente Separadas)
- **Linux (`v1.0.0`):** validação visual em Stremio Desktop Linux (CLI `v1.0.0` já validado em instalação limpa na Sprint 17.3).
- **macOS:** validação nativa completa em hardware macOS (`Not Tested`).
- **Chrome Extension (`1.0.0 RC`):** revisão final de promoção `RC → GA`, hospedagem pública da Política de Privacidade e submissão à Chrome Web Store (\$5 USD taxa única).

### D. Funcionalidades Futuras (Somente Pós-`1.0.0` / `v1.1+`)
- Empacotamento/instalador Windows com runtime Node embarcado (reduzindo a barreira de instalar Node.js 22+).
- Suporte a formatos de entrada adicionais (`ASS/SSA`).
- Verificação oficial no Microsoft Edge e outros navegadores Chromium para a extensão.
- Avaliação futura de criptografia opcional em repouso para persistência local.
