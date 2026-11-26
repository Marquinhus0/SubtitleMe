# SubtitleMe — Análise Estratégica de Produto e Mercado (Sprint 18.1)

> **Nota Metodológica:** Este documento diferencia explicitamente **Fatos verificados** (pesquisa pública de 2026 e estado real do código `v1.0.0`), **Hipóteses de mercado** (não validadas ainda por pesquisa primária com usuários) e **Recomendações estratégicas**. Nenhum número de tamanho de mercado ou *market share* foi inventado.

---

## 1. Problema Resolvido pelo SubtitleMe (Fato)

- Players nativos como o **Stremio Desktop** e a maioria dos players HTML5 exibem apenas **uma faixa de legenda por vez**.
- Estudantes de idiomas e espectadores bilíngues precisam alternar manualmente entre faixas, perdem sincronia entre releases diferentes (`WEB-DL` vs `BluRay`) ou recorrem a serviços na nuvem pagos/com telemetria.
- O **SubtitleMe** resolve isso **localmente no computador do usuário**: combina duas legendas simultâneas com sincronização bidirecional, anti-flicker (`380ms`), Modo Reveal (`0s–2s`), 37 idiomas e estilos `.ASS` / `Branco SRT` / `.VTT`, sem conta e sem backend remoto.

---

## 2. Mapa Competitivo Atual (Fatos — Referência 2026)

| Concorrente | Plataformas / Distribuição | Proposta Principal | Modelo de Monetização (2026) | Limitações / Lacunas |
| :--- | :--- | :--- | :--- | :--- |
| **Language Reactor** (`languagereactor.com`) | Extensão Chrome (apenas **YouTube e Netflix**; sem app mobile, sem Stremio) | Dual subtitles, dicionário, PhrasePump, exportação Anki e IA Lexa | Freemium: plano gratuito básico; Pro ~**\$5,95/mês** ou **\$39,95/ano** | Restrito a YouTube/Netflix; recursos avançados atrás de paywall; exige conta para Pro |
| **Trancy** (`trancy.org`) | Extensão Chrome/Firefox + apps (YouTube, Netflix, Disney+, Coursera, TED) | Legendas bilíngues com IA, modos Theater/Reading, coach de fala | Freemium: plano gratuito com limites; Premium ~**\$3,49–\$8/mês** (~**\$25,99–\$42/ano**) | Focado em serviços pagos de streaming e IA na nuvem; não integra ao Stremio |
| **Migaku** (`migaku.com`) | Extensão de navegador + app de flashcards | *Sentence mining* para flashcards/Anki com áudio e imagem | Pago (**sem plano gratuito permanente**): ~**\$10–\$15/mês** após trial | Barreira financeira alta; curva de aprendizado complexa; foco em nicho avançado |
| **FluentAI / Linglass** | Extensões de navegador (Netflix, YouTube, Prime, Disney+, Crunchyroll) | Legendas duplas + tradução contextual por IA + flashcards | Freemium: plano gratuito com limites diários; Premium ~**\$4,99–\$7,99/mês** | Dependência de nuvem/conta e limites de uso no plano gratuito; fora do ecossistema Stremio |
| **Addons comunitários Stremio (ex.: OpenSubtitles v3)** | Diretório/URLs Stremio | Entrega de legendas em **um único idioma por faixa** | Gratuitos / comunitários | Não combinam dois idiomas simultaneamente, sem Auto-Sync bilíngue, sem Modo Reveal nem Studio local |

---

## 3. Diferenciais Competitivos do SubtitleMe (Fatos vs. Oportunidades)

### Fatos comprovados na `v1.0.0`
1. **Nicho subatendido no ecossistema Stremio:** concorrentes consolidados (Language Reactor, Trancy, Migaku) concentram-se em YouTube/Netflix no navegador e **não atendem o Stremio Desktop**.
2. **Arquitetura 100% local-first e sem paywall:** zero conta, zero telemetria, zero assinatura; processamento local em `127.0.0.1`.
3. **Qualidade técnica superior de sincronização e leitura:** 1–5 pares ranqueados por sobreposição real, ancoragem bidirecional + correção de drift FPS, anti-flicker (`380ms`), Modo Reveal (`0s–2s` sem pulo vertical com `\u00A0`) e alternância `.ASS` estilizado ↔ `Branco SRT`.
4. **Suporte a arquivos locais (`.srt`/`.vtt`) + fontes automáticas:** combina OpenSubtitles v3 (sem chave), Subtitle Sync (opcional), OpenSubtitles REST API v1 (opcional) e uploads locais privados.

### Oportunidades pouco exploradas (Hipóteses)
- **Público que prioriza privacidade** e rejeita extensões que coletam histórico de reprodução ou exigem login obrigatório.
- **Estudantes de idiomas no Brasil e América Latina** sensíveis a assinaturas em dólar (\$6–\$15/mês).
- **Sinergia futura entre Stremio Addon (`1.0.0`) e Chrome Extension (`1.0.0 RC`)** sob uma única marca minimalista e gratuita.

---

## 4. Vantagens, Limitações e Barreiras de Adoção

### Vantagens da arquitetura atual
- Custo operacional **próximo de zero** (sem servidores de backend ou banco de dados na nuvem).
- Alta segurança e conformidade de privacidade (`127.0.0.1` loopback, 256-bit session token, CSRF, anti-DNS rebinding).

### Barreiras reais de adoção (Fatos)
1. **Pré-requisito técnico:** exige **Node.js `>= 22`** e execução manual de terminal (`start-companion.cmd` / `.sh`), o que gera fricção para usuários não técnicos.
2. **Restrição de plataforma:** validado principalmente em **Windows 11 + Stremio Desktop `5.0.28`**; **macOS não validado**; **Android, Android TV, Smart TVs e iOS não suportados** por causa do loopback `127.0.0.1`.
3. **Configuração manual única no Stremio:** ativar *Estilizar legendas ASS* para cores personalizadas (mitigada pelo modo `Branco SRT`).
4. **Extensão Chrome ainda em `1.0.0 RC`:** não publicada na Chrome Web Store (não pode ser promovida como GA nesta fase).
