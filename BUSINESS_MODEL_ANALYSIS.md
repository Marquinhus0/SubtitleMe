# SubtitleMe — Análise de Modelo de Negócio (Sprint 18.1)

> **Governança:** Nenhum mecanismo de pagamento será implementado nesta sprint. A análise abaixo compara cenários de sustentabilidade respeitando o modelo atual **local-first, sem backend e sem telemetria**.

---

## 1. Comparação dos Três Cenários

| Critério | Cenário A — 100% Gratuito | Cenário B — Freemium (Básico grátis + Pro futuro) | Cenário C — Gratuito com Apoio Voluntário (Doações / Patrocínio) |
| :--- | :--- | :--- | :--- |
| **Complexidade técnica** | **Mínima** (zero billing, zero contas, zero licença) | **Alta** (exige contas, gateway de pagamento, validação de licença, backend ou chaves assinadas, suporte pago) | **Baixa** (links externos: GitHub Sponsors, Ko-fi, Buy Me a Coffee, Pix/Open Collective) |
| **Custos operacionais** | **\$0/mês** (local-first) | **Médios/Altos** (taxas de gateway, contabilidade/impostos, infraestrutura de licenciamento/IA) | **Quase \$0/mês** (apenas taxas sobre doações recebidas) |
| **Potencial de receita** | Nulo (`\$0`) | **Maior no médio/longo prazo** (concorrentes cobram \$3,49–\$15/mês por IA/nuvem/flashcards) | **Modesto e variável** (cobre domínio, certificados Code Signing e manutenção comunitária) |
| **Impacto na adoção inicial** | **Máximo** (zero fricção, forte boca a boca) | **Reduzido** se restringir recursos essenciais; exige massa crítica prévia | **Máximo** (produto continua 100% gratuito e sem paywall) |
| **Custos de manutenção** | Baixos (manutenção de código/compatibilidade) | Altos (SLA de suporte a assinantes, chargebacks, gestão de assinaturas) | Baixos (atualizações comunitárias + agradecimento a apoiadores) |
| **Riscos de monetização** | Risco de esgotamento do mantenedor sem retorno | Conflito com a narrativa *zero conta / 100% local*; risco de baixa conversão sem recursos exclusivos de IA/nuvem | Receita imprevisível, insuficiente para financiar equipe dedicada |

---

## 2. Recomendação Inicial Fundamentada

### **Recomendação: Cenário C — Gratuito com Apoio Voluntário (no Lançamento `v1.0.0`), com porta aberta para Freemium opcional apenas no Pós-1.0**

**Justificativa:**
1. **Aderência total à arquitetura `v1.0.0`:** o SubtitleMe roda 100% localmente com custo de servidor igual a **\$0**. Introduzir paywall ou sistema de contas agora destruiria o principal diferencial competitivo frente a Language Reactor (\$5,95/mês), Trancy (\$3,49–\$8/mês) e Migaku (\$10–\$15/mês).
2. **Maximização de adoção e prova de valor:** o maior risco no lançamento `v1.0.0` não é receita — é **adoção frente à fricção do setup local (Node.js 22+)**. Ser 100% gratuito sem limitações artificiais maximiza o boca a boca em comunidades de idiomas e Stremio.
3. **Sustentabilidade pragmática:** apoio voluntário (ex.: GitHub Sponsors / Ko-fi) mantém complexidade zero e pode financiar custos concretos futuros (domínio anual, taxa única de \$5 da Chrome Web Store e eventual certificado Code Signing para instalador Windows).
4. **Opcionalidade futura (Hipótese Pós-1.0):** caso a base cresça e os usuários peçam recursos com custo real de nuvem (como tradução contextual por IA, sincronização multi-dispositivo criptografada ou flashcards Anki integrados), um plano Pro opcional poderá ser avaliado sem jamais retirar recursos já gratuitos da `v1.0.0`.
