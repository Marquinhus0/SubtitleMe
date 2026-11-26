# SubtitleMe — Público-Alvo e Personas (Sprint 18.1)

> **Aviso de Governança:** As personas abaixo são **hipóteses estruturadas** baseadas no posicionamento do produto e em padrões públicos de uso de ferramentas de legendas bilíngues — **não representam pesquisa primária executada com usuários reais**. Deverão ser validadas durante o Beta Fechado (Fase 6).

---

## 1. Avaliação de Segmentos Prioritários (Hipóteses)

| Segmento | Aderência Atual (`v1.0.0` Stremio Desktop) | Prioridade Inicial | Justificativa |
| :--- | :--- | :--- | :--- |
| **1. Estudantes de inglês (nível A2–B2)** | **Alta** | **Prioridade 1 (Foco Primário)** | Maior demanda por imersão com filmes/séries; beneficia-se diretamente do Modo Reveal (`0.5s–2s`) e 1–5 pares ranqueados. |
| **2. Estudantes de outros idiomas (ES, FR, DE, JA, KO, etc.)** | **Alta** | **Prioridade 1** | 37 idiomas suportados atendem fortemente aprendizes de japonês, coreano, espanhol e idiomas europeus. |
| **3. Consumidores frequentes de filmes/séries no Stremio Desktop** | **Alta** | **Prioridade 2** | Já conhecem o fluxo de addons do Stremio e toleram melhor o setup local do Companion. |
| **4. Pessoas multilíngues / casais e famílias bilíngues** | **Média-Alta** | **Prioridade 2** | Assistem juntos no PC/monitor sem precisar alternar legendas; valorizam cores distintas `.ASS` e `Branco SRT`. |
| **5. Comunidades de aprendizagem de idiomas (Reddit, Discord, YouTube)** | **Média-Alta** | **Canal Multiplicador** | Alto potencial orgânico de recomendação entre autodidatas que já conhecem Language Reactor e buscam alternativa gratuita/local. |
| **6. Professores e educadores** | **Baixa-Média (na `v1.0.0`)** | **Prioridade 3 (Futuro)** | Uso em sala geralmente prefere navegador (Chrome Extension futura) ou vídeos locais sem exigir instalação de Stremio + Node.js. |

---

## 2. Personas Hipotéticas (4 Perfis)

### Persona 1 — Lucas, 24 anos (Estudante de Inglês Autodidata · Brasil) *[Hipótese]*
- **Contexto de uso:** Assiste a séries em inglês à noite no notebook **Windows 11** com **Stremio Desktop**.
- **Objetivos:** Evoluir compreensão auditiva (B1 → B2) sem pausar o episódio a cada frase desconhecida.
- **Dificuldades:** Legenda só em inglês faz perder o contexto; legenda só em português elimina o aprendizado; pagar \$6/mês em dólar em extensões SaaS pesa no orçamento.
- **Motivação para testar o SubtitleMe:** Gratuito, 100% local, **Modo Reveal (`1s`)** para tentar entender em inglês antes de ver o português.
- **Possíveis objeções:** Precisar instalar Node.js 22+ e deixar o terminal do Companion aberto.

### Persona 2 — Mariana, 29 anos (Estudante de Japonês / Coreano & Fã de Séries) *[Hipótese]*
- **Contexto de uso:** Consome animes e K-dramas no desktop Windows usando Stremio e arquivos `.srt`/`.vtt` próprios.
- **Objetivos:** Associar expressões em japonês/coreano ao português ou inglês em tempo real, com boa legibilidade visual.
- **Dificuldades:** Legendas fora de sincronia entre releases diferentes; falta de opções bilíngues no Stremio.
- **Motivação para testar o SubtitleMe:** Suporte a **37 idiomas**, **1–5 pares ranqueados** para trocar de release em 1 clique, **Auto-Sync** e cores distintas em `.ASS`.
- **Possíveis objeções:** Precisar ativar *Estilizar legendas ASS* nas configurações do Stremio Desktop.

### Persona 3 — Rafael, 33 anos (Usuário Técnico de Stremio & Entusiasta de Privacidade) *[Hipótese]*
- **Contexto de uso:** Desenvolvedor/profissional de TI em Windows 11 ou Linux; valoriza ferramentas open-source, sem telemetria e sem conta obrigatória.
- **Objetivos:** Ter legendas duplas rápidas e confiáveis no Stremio Desktop sem enviar dados de uso para serviços de terceiros.
- **Dificuldades:** Addons hospedados em terceiros caem, exibem anúncios ou exigem cadastro.
- **Motivação para testar o SubtitleMe:** Arquitetura loopback `127.0.0.1`, código auditável no GitHub, zero telemetria e persistência local opt-in.
- **Possíveis objeções:** Querer suporte nativo validado em Linux/macOS ou uso na TV da sala (Android TV — não suportado na `v1.0.0`).

### Persona 4 — Sofia & Daniel, 31 anos (Casal Bilíngue — Português / Espanhol ou Inglês) *[Hipótese]*
- **Contexto de uso:** Assistem filmes juntos no PC conectado a um monitor/TV via HDMI no Windows.
- **Objetivos:** Cada pessoa acompanhar a legenda no próprio idioma confortavelmente.
- **Dificuldades:** Escolher apenas um idioma deixa um dos dois desconfortável.
- **Motivação para testar o SubtitleMe:** Cores diferenciadas para cada idioma, ajuste de tamanho de fonte ao vivo em `/configure` sem reinstalar o addon.
- **Possíveis objeções:** Menor familiaridade técnica com linha de comando (`start-companion.cmd`) — dependem de instruções visuais simples (`QUICKSTART.md` / `INSTALLATION.md`).
