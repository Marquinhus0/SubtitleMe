# SubtitleMe — Estratégia de Canais de Distribuição (Sprint 18.1)

> **Princípio de Governança:** O **Stremio Addon (`v1.0.0` GA local)** e a **Chrome Extension (`v1.0.0 RC`, não GA)** possuem arquiteturas, públicos e requisitos de canal distintos e **não** devem ser tratados como publicáveis nos mesmos diretórios.

---

## 1. Canais — Stremio Addon (`v1.0.0` + Local Companion)

| Canal | Requisitos & Restrições (Fatos) | Processo & Custos | Vantagens | Riscos / Dependências | Elegibilidade Atual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GitHub Releases (`Marquinhus0/SubtitleMe`)** | Tag Git (`v1.0.0` já existe), anexo manual de `subtitleme-stremio-v1.0.0.tar.gz` + `.sha256`, licença raiz recomendada (`LICENSE`). | Gratuito (`\$0`). Criar Release na UI/CLI após autorização. | Canal nativo para pacotes standalone + verificação SHA-256 + histórico público transparente + Issues para feedback. | Público não técnico pode estranhar a interface do GitHub. | **Elegível imediatamente (Canal Primário Recomendado)** |
| **Site Oficial (Landing Page futura, ex.: GitHub Pages / Vercel)** | Domínio opcional (~\$10–\$15/ano) ou GitHub Pages gratuito (`\$0`). Aponta para o artefato oficial no GitHub Releases. | Gratuito (GitHub Pages) ou baixo custo de domínio. | Onboarding visual amigável, reduz atrito para estudantes de idiomas não técnicos. | Ainda não desenvolvido (copy pronta em `docs/LANDING_PAGE_CONTENT.md`). | **Elegível após construção da landing page** |
| **Instalação por URL local (`http://127.0.0.1:7000/manifest.json`)** | Requer Local Companion ativo na máquina do usuário (Node.js `>= 22`). | Gratuito (`\$0`). Já implementado e validado. | 100% local, zero servidor remoto, edição ao vivo sem reinstalar. | Exige terminal aberto; não funciona em mobile/TV. | **Elegível imediatamente (Mecanismo Principal de Conexão)** |
| **Diretório Oficial/Comunitário de Addons Stremio** (`stremio-addons.net` / catálogo oficial) | Exige URL **HTTPS pública acessível na internet** (ex.: `https://.../manifest.json`) com uptime contínuo. **Não aceita `http://127.0.0.1`.** | Gratuito na listagem, mas exigiria hospedagem cloud (custo mensal + mudança arquitetural para backend remoto). | Alta descoberta orgânica dentro do ecossistema Stremio. | **Incompatível com a arquitetura `127.0.0.1` da `v1.0.0`**; exigiria backend remoto e revisão completa de privacidade/custos. | **Não elegível na `v1.0.0`** |
| **Distribuição do Companion (Instalador nativo futuro)** | Exigiria empacotamento standalone com runtime Node embarcado + assinatura de código (certificado Windows Code Signing pago para evitar alertas SmartScreen). | Custo de certificado Code Signing (centenas de USD/ano). | Elimina pré-requisito de Node.js 22+ para usuários leigos. | Fora do escopo da `v1.0.0`; gera alertas do Windows SmartScreen se não assinado. | **Futuro (Pós-1.0)** |

---

## 2. Canais — Chrome Extension (`v1.0.0 RC` — NÃO GA)

| Canal | Requisitos & Restrições (Fatos 2026) | Processo & Custos | Vantagens | Riscos / Dependências | Elegibilidade Atual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chrome Web Store (CWS)** | Conta Google Developer com **2-Step Verification**, Manifest V3 (já atendido), ZIP limpo (`subtitleme-chrome-v1.0.0.zip`), ícones 128/48/16, screenshots, política de privacidade hospedada em URL pública, justificativa de permissões e revisão do Google (horas a dias úteis). | Taxa única de registro de **\$5 USD** por conta de desenvolvedor (listagem gratuita após registro). | Principal canal de descoberta e instalação em 1 clique para Chrome/Chromium. | **Extensão ainda está em `1.0.0 RC` (não promovida a GA)**; requer conta CWS ativa, URL pública da política de privacidade e revisão final de loja. | **Condicionalmente elegível (somente após promoção da extensão de RC para GA)** |
| **Instalação de desenvolvimento (`chrome://extensions` unpacked)** | Modo Desenvolvedor ativado + pasta extraída do ZIP. | Gratuito (`\$0`). | Útil para testes internos/beta fechado imediato. | Inadequado para usuários finais (Chrome exibe aviso de extensão em modo desenvolvedor). | **Elegível apenas para Alpha/Beta técnico** |
| **Site Oficial / Outras Lojas (Edge Add-ons)** | Edge Add-ons possui registro gratuito (Microsoft Partner Center) para extensões Chromium MV3. | Gratuito (`\$0`). | Expansão futura natural para usuários Windows/Edge. | Ainda não validado nativamente no Microsoft Edge. | **Futuro (Pós-GA da extensão)** |

---

## 3. Recomendação de Sequenciamento de Canais

1. **Curto Prazo (Stremio Addon `v1.0.0`):** distribuir exclusivamente via **GitHub Releases** (tarball standalone + `.sha256` + guias de `distribution/v1.0.0/`) complementado futuramente por uma **Landing Page estática** apontando para a release oficial.
2. **Médio Prazo (Chrome Extension):** concluir a promoção da extensão de `1.0.0 RC` → `1.0.0 GA`, hospedar a Política de Privacidade em URL pública (ex.: GitHub Pages) e submeter à **Chrome Web Store** (taxa única \$5 USD).
