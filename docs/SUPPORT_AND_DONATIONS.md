# SubtitleMe — Auditoria de Plataformas de Doação, Política de Apoio e FAQ

> **Princípio inegociável:** O SubtitleMe é 100% gratuito, local e aberto. Contribuições são **estritamente opcionais**, não desbloqueiam recursos extras, não oferecem vantagens exclusivas e nenhum dado financeiro trafega ou fica armazenado no projeto.

---

## 1. Auditoria Comparativa: GitHub Sponsors vs Ko-fi

> **Nota de rigor:** Disponibilidade regional de saques, requisitos fiscais e taxas exatas dos processadores de pagamento (Stripe / PayPal) variam por país e podem mudar ao longo do tempo. Os critérios abaixo refletem as características estruturais das plataformas e devem ser confirmados diretamente pelo mantenedor nos painéis oficiais antes da ativação.

| Critério | GitHub Sponsors | Ko-fi |
| :--- | :--- | :--- |
| **Facilidade de configuração** | Moderada — exige conta GitHub verificada, aprovação no programa GitHub Sponsors e vinculação fiscal/bancária (ex.: Stripe Connect, sujeito a elegibilidade regional). | Alta — criação rápida de página pública conectada a PayPal ou Stripe, conforme disponibilidade no país do mantenedor. |
| **Disponibilidade para o projeto** | Requer verificação prévia pelo mantenedor se o país de residência é elegível para recebimento no programa oficial do GitHub. | Requer verificação prévia pelo mantenedor quanto aos provedores de saque suportados em sua região (PayPal/Stripe). |
| **Experiência do apoiador** | Nativa para usuários com conta GitHub (botão *Sponsor* no repositório), suportando apoio único ou mensal. Exige login no GitHub. | Baixa fricção para usuários finais de filmes/séries e estudantes de idiomas, pois não exige conta GitHub para doações pontuais. |
| **Taxas e condições aplicáveis** | Condições definidas oficialmente pelo GitHub Sponsors e processadores parceiros; confirmar taxas atuais no portal oficial antes de ativar. | Condições definidas oficialmente pelo Ko-fi (doações pontuais vs recursos de assinatura) e taxas dos processadores (PayPal/Stripe); confirmar no portal oficial antes de ativar. |
| **Compatibilidade com o posicionamento gratuito** | **Altíssima** — padrão consolidado em projetos open-source sem conotação de paywall. | **Alta** — desde que configurado apenas para doações voluntárias sem tiers de conteúdo exclusivo. |

### Recomendação Oficial

1. **Canal primário recomendado (comunidade open-source):** **GitHub Sponsors**, se elegível na região do mantenedor, pela confiança institucional e integração nativa com o repositório `Marquinhus0/SubtitleMe`.
2. **Canal complementar recomendado (usuários finais do Stremio):** **Ko-fi**, por eliminar a barreira de criar conta no GitHub para quem apenas deseja enviar um apoio pontual voluntário.
3. **Estratégia segura:** ativar primeiro a plataforma disponível na região do mantenedor e habilitar o link correspondente via variável de ambiente no build da landing page — **nunca publicar URLs não verificadas**.

---

## 2. Como Ativar os Links Oficiais na Landing Page

A integração em [`apps/landing-page/src/config/supportConfig.ts`](../apps/landing-page/src/config/supportConfig.ts) valida estritamente origens HTTPS oficiais (`https://github.com/sponsors/...` e `https://ko-fi.com/...`) em tempo de build e mantém estado seguro de *"Aguardando ativação oficial"* quando não configuradas:

```bash
# Exemplo de build da landing page após ativar a(s) conta(s) oficial(is):
VITE_GITHUB_SPONSORS_URL="https://github.com/sponsors/<handle-oficial>" \
VITE_KOFI_URL="https://ko-fi.com/<handle-oficial>" \
pnpm --filter @subtitleme/landing-page build
```

---

## 3. Texto Oficial de Apoio Voluntário

> **Apoie o SubtitleMe (100% opcional)**
>
> O SubtitleMe existe para ajudar pessoas a aprender idiomas assistindo a filmes e séries — localmente, com privacidade e gratuitamente. Não há planos pagos, anúncios, contas obrigatórias ou recursos bloqueados.
>
> Se o projeto faz diferença na sua rotina de estudos e você quiser apoiar a manutenção contínua e testes em novas plataformas, você pode contribuir voluntariamente por meio das plataformas oficiais externas. Quem não contribui continua tendo exatamente o mesmo acesso a todas as funcionalidades.

---

## 4. FAQ sobre Doações

### Preciso doar para usar o SubtitleMe?
**Não.** Todas as funcionalidades do SubtitleMe Stremio Addon (`v1.0.0`) são 100% gratuitas e liberadas para todos os usuários.

### Apoiadores recebem recursos extras, versões antecipadas ou suporte prioritário pago?
**Não.** Por princípio do projeto, não existem planos pagos, vantagens exclusivas ou recursos bloqueados.

### O SubtitleMe armazena dados de cartão ou informações financeiras?
**Nunca.** O aplicativo e a landing page não possuem backend financeiro, não processam pagamentos e não coletam dados de apoiadores. Qualquer contribuição ocorre exclusivamente nos sites externos oficiais (GitHub Sponsors ou Ko-fi).

### Para onde vão as contribuições voluntárias?
Ajudam a sustentar o tempo de desenvolvimento independente, manutenção de compatibilidade com novas versões do Stremio Desktop e futura validação em plataformas adicionais (como Linux Desktop e macOS).

### Como posso apoiar sem gastar dinheiro?
Você pode deixar uma estrela no repositório GitHub, compartilhar o projeto com quem estuda idiomas, revisar a documentação ou reportar bugs detalhados em GitHub Issues.
