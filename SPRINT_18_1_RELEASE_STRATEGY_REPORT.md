# Relatório Executivo — Sprint 18.1: Release Strategy & Go-to-Market Planning

**Data:** 2026-11-26  
**Produto:** SubtitleMe (`Stremio Addon v1.0.0` GA local · `Chrome Extension v1.0.0 RC` não publicada)  
**Commit Base (`HEAD`):** `b546fc7a1590650246c3e5add923965275045d21` (`tag v1.0.0`)

---

## 1. Diagnóstico do Produto (Fatos)

- **Stremio Addon (`v1.0.0`):** Tecnicamente maduro, auditado em segurança (15 controles aprovados), validado em instalação limpa no Windows 11 (Sprint 16.2) e no Linux (Sprint 17.3), com documentação completa de onboarding (`README.md`, `QUICKSTART.md`, `INSTALLATION.md`, `USER_GUIDE.md`, `PRIVACY_AND_SECURITY.md`, `FAQ.md`, `distribution/v1.0.0/`).
- **Chrome Extension (`v1.0.0 RC`):** Funcional e com E2E real aprovado, porém **não possui status GA** e ainda não foi submetida à Chrome Web Store — deve seguir em trilha separada de lançamento.
- **Principal força:** Resolve uma dor real sem concorrente direto de mesma qualidade no Stremio Desktop, de forma 100% local, gratuita e sem telemetria.
- **Principal barreira:** Exigência de Node.js `>= 22`, execução local em terminal e escopo restrito a Desktop (`127.0.0.1` — sem mobile/TV e sem macOS validado).

---

## 2. Público Prioritário (Hipóteses a Validar no Beta)

1. **Estudantes autodidatas de inglês e outros idiomas (A2–B2)** que já usam ou adotam o Stremio Desktop no Windows 11.
2. **Usuários técnicos de Stremio Desktop** sensíveis a privacidade e custo (alternativa gratuita a extensões pagas em dólar).
3. **Casais e pessoas multilíngues** assistindo no desktop/monitor.

*(Detalhes em [TARGET_AUDIENCE_AND_PERSONAS.md](./TARGET_AUDIENCE_AND_PERSONAS.md).)*

---

## 3. Posicionamento Recomendado

- **Tagline:** *"Two languages. One experience."*
- **Posicionamento:** *"Learn languages through entertainment — locally, privately, and free."*
- **Identidade:** Obsidian Dark + Emerald (`#10B981`) + Mint (`#34D399`), minimalista, transparente e sem promessas não comprovadas (ver guardrails em [PRODUCT_POSITIONING.md](./PRODUCT_POSITIONING.md)).

---

## 4. Estratégia de Distribuição

- **Stremio Addon `v1.0.0` (imediato):** **GitHub Releases** (anexando `subtitleme-stremio-v1.0.0.tar.gz` + `.sha256` oficial `7f298f2b...`) + futura **Landing Page estática** (GitHub Pages gratuito). *Diretórios públicos de addons Stremio que exigem HTTPS público não são elegíveis pela arquitetura `127.0.0.1`.*
- **Chrome Extension (médio prazo):** somente após promoção de `1.0.0 RC` → `1.0.0 GA`, submeter à **Chrome Web Store** (taxa única de **\$5 USD** + URL pública de Política de Privacidade).

*(Detalhes em [DISTRIBUTION_CHANNEL_STRATEGY.md](./DISTRIBUTION_CHANNEL_STRATEGY.md).)*

---

## 5. Modelo de Negócio Recomendado

- **Cenário C — 100% Gratuito com Apoio Voluntário** (ex.: GitHub Sponsors / Ko-fi) no lançamento `v1.0.0`.
- Preserva custo operacional `\$0`, elimina fricção de adoção, reforça a diferenciação frente a concorrentes de \$3,49–\$15/mês e pode financiar custos pontuais futuros (domínio, taxa CWS \$5 e eventual assinatura de código Windows).

*(Detalhes em [BUSINESS_MODEL_ANALYSIS.md](./BUSINESS_MODEL_ANALYSIS.md).)*

---

## 6. Estratégia de Lançamento

Lançamento progressivo em 3 estágios: **Alpha** (concluído para Stremio `v1.0.0`) → **Beta Fechado** (10–25 usuários reais em Windows 11 / Linux) → **Public Launch** (GitHub Release + Landing Page + divulgação orgânica transparente). *(Detalhes em [GO_TO_MARKET_PLAN.md](./GO_TO_MARKET_PLAN.md).)*

---

## 7. Métricas (Privacy-First)

Zero telemetria no software: acompanhar exclusivamente **downloads de assets no GitHub Releases**, **GitHub Insights**, **Issues categorizadas** (erros de instalação/configuração) e **feedback voluntário estruturado** no Beta. *(Detalhes em [PRODUCT_METRICS_PLAN.md](./PRODUCT_METRICS_PLAN.md).)*

---

## 8. Roadmap

Sequenciado em 5 fases em [RELEASE_ROADMAP.md](./RELEASE_ROADMAP.md), separando rigorosamente pré-requisitos obrigatórios (`LICENSE`, templates de Issue, Beta Fechado) de evoluções pós-`1.0.0` (instalador Windows sem Node prévio, validação macOS, Chrome Extension GA).

---

## 9. Principais Riscos

1. **Atrito na instalação do Node.js 22+** para usuários não técnicos.
2. **Expectativa frustrada de uso em Smart TV / Android / macOS** caso a comunicação de lançamento não destaque claramente as limitações desde o primeiro parágrafo.
3. **Ausência de arquivo `LICENSE` na raiz** antes da divulgação pública.
4. **Confusão de escopo** entre Stremio Addon (`1.0.0` GA) e Chrome Extension (`1.0.0 RC`).

---

## 10. Decisões que Dependem do Usuário (Mantenedor)

1. **Licença do projeto:** Qual licença open-source/fonte-disponível adotar no arquivo `LICENSE` raiz (ex.: MIT, Apache-2.0, GPL-3.0)?
2. **Apoio voluntário:** Deseja habilitar GitHub Sponsors / Ko-fi no lançamento ou manter 100% gratuito sem link de doação inicialmente?
3. **Landing Page:** Deseja construir e publicar a Landing Page estática (GitHub Pages) antes do Public Launch, ou lançar primeiro apenas via GitHub Releases?
4. **Beta Fechado:** Deseja executar o Beta Fechado com 10–25 usuários antes da GitHub Release pública `v1.0.0`?
5. **Trilha da Chrome Extension:** Deseja priorizar o lançamento do Stremio `v1.0.0` primeiro e tratar a promoção/submissão da Chrome Extension na CWS (\$5 USD) em uma sprint dedicada posterior?

---

## 11. Recomendação Objetiva Final

> ### **DECISÃO: `CONDITIONAL GO` para iniciar a preparação operacional do lançamento (`Beta Fechado`)**

**Condições objetivas para avançar:**
1. Definição e inclusão do arquivo `LICENSE` na raiz do repositório.
2. Autorização explícita do mantenedor para commit/push da documentação das Sprints 17.2–18.1 e abertura de GitHub Issues/Discussions templates.
3. Execução do **Beta Fechado** (10–25 usuários reais) antes de qualquer divulgação pública em larga escala, mantendo todas as restrições de compatibilidade explícitas (**Windows 11 validado, Linux parcial, macOS não validado, mobile/TV não suportados**) e a **Chrome Extension** separada até sua própria promoção a GA.

---

### Confirmação de Governança
- Nenhuma publicação externa, GitHub Release, commit, tag ou push foi executada.
- Nenhuma funcionalidade ou versão (`1.0.0`) foi alterada.
