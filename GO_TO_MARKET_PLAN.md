# SubtitleMe — Plano de Go-to-Market e Lançamento (Sprint 18.1)

> **Nota:** Nenhum teste com usuários externos foi executado ainda; os indicadores abaixo definem metas e critérios de passagem (*gates*), não resultados obtidos.

---

## 1. Estratégia de Lançamento em 3 Fases

### Fase A — Alpha (Validação Técnica Interna) — *Status: Concluída para Stremio `v1.0.0` no Windows 11*
- **Objetivo:** Comprovar estabilidade funcional, segurança, instalação limpa fora do monorepo e reprodução real no Stremio Desktop.
- **Critérios de entrada:** Build reproduzível, suíte automatizada verde (`134` testes no Windows / `128+` no Linux), auditoria de segurança aprovada.
- **Critérios de saída:** Tag `v1.0.0` criada, pacote standalone `subtitleme-stremio-v1.0.0.tar.gz` verificado (`SHA-256: 7f298f2b...`), documentação de onboarding pronta (Sprints 17.2–17.3).

### Fase B — Beta Fechado (Grupo Reduzido: 10–25 usuários externos) — *Próximo Passo Recomendado*
- **Público:** Estudantes de idiomas e usuários de Stremio Desktop no **Windows 11** (e voluntários Linux técnicos), convidados diretamente em grupos fechados/Discord.
- **Critérios de entrada:**
  1. Arquivo `LICENSE` adicionado na raiz do repositório.
  2. Documentação das Sprints 17.2–17.3 commitada e publicada no repositório.
  3. Canal estruturado de feedback pronto (GitHub Discussions + template de Issue para bugs/onboarding).
- **Critérios de saída:**
  - ≥ 80% dos testadores conseguem instalar, conectar ao Stremio Desktop e ver legendas bilíngues em até 10 minutos sem assistência direta *(meta hipotética)*.
  - Zero bugs críticos/altos de segurança, travamento do Companion ou perda silenciosa de configuração.
  - Principais dúvidas de onboarding incorporadas ao `docs/FAQ.md` e `docs/INSTALLATION.md`.
- **Riscos:** Fricção com instalação de Node.js 22+, bloqueio de `ExecutionPolicy` (caso usem `.ps1` em vez de `.cmd`), esquecimento de ativar *Estilizar legendas ASS*.

### Fase C — Public Launch (Disponibilização Pública `v1.0.0`)
- **Objetivo:** Publicação oficial da GitHub Release `v1.0.0` (anexando `subtitleme-stremio-v1.0.0.tar.gz` + `.sha256`), divulgação orgânica e (se construída) ativação da Landing Page.
- **Critérios de entrada:** Saída aprovada do Beta Fechado + decisão formal do mantenedor sobre publicação pública.
- **Critérios de saída / sucesso inicial:** Adoção orgânica sustentável, taxa baixa de issues repetitivas de instalação, validação de demanda real para Linux/macOS e priorização orientada por feedback da `v1.1.0`.

---

## 2. Plano de Comunicação (Orgânico, Sem Custo de Mídia)

| Momento | Canais Recomendados | Mensagem Principal |
| :--- | :--- | :--- |
| **Beta Fechado** | Convite direto em servidores Discord de aprendizado de idiomas e comunidades Stremio | *"Teste o SubtitleMe v1.0.0: legendas bilíngues locais para Stremio Desktop (Windows 11) — buscamos feedback honesto sobre instalação e uso."* |
| **Public Launch** | GitHub Release oficial + posts transparentes em comunidades relevantes (ex.: `r/StremioAddons`, `r/languagelearning`, grupos BR de estudo de inglês) + vídeo curto (60s) mostrando Modo Reveal e Dual `.ASS` | *"Two languages. One experience. Lançamos o SubtitleMe v1.0.0 — legendas bilíngues simultâneas, 37 idiomas, Auto-Sync, Modo Reveal, 100% local e gratuito."* |

*Regra obrigatória de comunicação:* sempre explicitar no post de lançamento os requisitos (**Windows 11 + Node.js 22+ + Stremio Desktop**) e as limitações (**sem mobile/TV e sem macOS validado**).

---

## 3. Estratégia de Feedback

- **GitHub Issue Templates:** separar claramente `Bug Report` (incluindo versão do Windows/Node/Stremio e saída de `/companion/health`, nunca pedindo API keys), `Onboarding / Instalação` e `Feature Request`.
- **Formulário curto opcional (pós-Beta):** 5 perguntas objetivas (tempo até a primeira legenda bilíngue, maior dificuldade na instalação, qualidade da sincronização, uso do Modo Reveal e interesse em Chrome Extension / macOS).
