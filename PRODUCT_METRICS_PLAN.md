# SubtitleMe — Plano de Métricas e Indicadores Privacy-First (Sprint 18.1)

> **Regra de Privacidade:** O SubtitleMe `v1.0.0` possui **zero telemetria** e **zero coleta de dados pessoais**. Este plano respeita integralmente a arquitetura *privacy-first*: nenhuma telemetria oculta ou rastreamento de histórico de reprodução será proposto.

---

## 1. Métricas Mensuráveis Atualmente (Zero Telemetria no Software)

Estas métricas já podem ser acompanhadas sem alterar uma linha do código da `v1.0.0`, usando apenas plataformas de distribuição e feedback voluntário:

| Métrica | Fonte de Dados | O que Mede | Limitação Honesta |
| :--- | :--- | :--- | :--- |
| **Downloads do pacote GA** | Contador nativo de assets do **GitHub Releases** (`subtitleme-stremio-v1.0.0.tar.gz`) | Interesse e alcance da distribuição | Não mede quantos downloads resultaram em instalação concluída |
| **Estrelas / Clones / Tráfego** | **GitHub Insights** (anônimo e agregado) | Descoberta orgânica do repositório | Janela de 14 dias para clones/visitas no GitHub |
| **Conversão de visitantes (Site futuro)** | Analytics estático *cookieless* e sem dados pessoais na Landing Page (ex.: contagem agregada de cliques no botão de download, se adotado) | Efetividade da proposta de valor e copy | Mede clique no download, não ativação no Companion |
| **Erros de instalação e configuração** | **GitHub Issues** etiquetadas (`onboarding`, `windows`, `linux`, `ass-styling`, `port-7000`) | Principais pontos de atrito no setup inicial | Captura apenas usuários que reportam problemas |
| **Primeiro uso bem-sucedido & Satisfação** | Formulário voluntário pós-Beta (anônimo, 5 perguntas) e **GitHub Discussions** | Tempo até a primeira legenda bilíngue, qualidade percebida do Auto-Sync e Reveal Mode | Amostra voluntária (viés de auto-seleção) |
| **Instalações da Chrome Extension (Futuro)** | **Chrome Web Store Developer Dashboard** (após eventual publicação GA) | Instalações semanais, desinstalações e avaliações públicas | Aplicável apenas quando a extensão for promovida a GA e publicada |

---

## 2. Métricas que Exigiriam Instrumentação Futura (Não Existentes na `v1.0.0`)

As métricas abaixo **não podem ser medidas atualmente** sem adicionar código ao produto; só devem ser consideradas em versões futuras **com opt-in explícito e dados estritamente agregados (sem IDs de filmes ou IPs)**:

| Métrica | Por que Não Existe na `v1.0.0` | Condição Ética para Futuro (Pós-1.0) |
| :--- | :--- | :--- |
| **Instalações ativas (DAU/WAU)** | O Companion roda offline/local em `127.0.0.1` sem ping externo | Exigiria ping anônimo *opt-in* (desligado por padrão) — **não recomendado** para a proposta privacy-first |
| **Ativação automática (1º par bilíngue gerado)** | Sem telemetria no servidor local | Pode ser substituída por um botão opcional "Exportar diagnóstico anônimo" para suporte manual |
| **Retenção (D7 / D30)** | Sem contas nem rastreamento | No Beta Fechado, medir via check-in voluntário com testadores após 7 e 30 dias |
| **Taxa de falha por provedor externo** | Logs locais apenas no terminal do usuário | Manter diagnóstico local em `/configure` (já existe o botão **Testar**) sem enviar dados para fora |

---

## 3. Recomendação Operacional

Para o lançamento da `v1.0.0`, operar **100% com as métricas da Seção 1** (downloads do GitHub Release + categorização disciplinada de Issues + feedback voluntário do Beta Fechado). Isso preserva integralmente a promessa de **zero telemetria**.
