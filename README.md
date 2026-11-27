# SubtitleMe

> **Two languages. One experience.**

**SubtitleMe** é um sistema **local-first** de legendas bilíngues simultâneas projetado para quem aprende idiomas ou assiste a filmes e séries com duas legendas ao mesmo tempo — sem contas na nuvem, sem assinaturas e sem telemetria.

O monorepo reúne dois produtos independentes que compartilham o mesmo motor de parsing e merge:

- **SubtitleMe Stremio Addon (`v1.0.1`)** — Addon + Local Companion (`127.0.0.1`) que combina duas legendas em uma única faixa bilíngue para o **Stremio Desktop** ([Release oficial `v1.0.1`](https://github.com/Marquinhus0/SubtitleMe/releases/tag/v1.0.1)).
- **SubtitleMe Chrome Extension (`v1.0.0 RC`)** — Extensão Chrome Manifest V3 que renderiza duas legendas simultâneas via Shadow DOM sobre players HTML5 compatíveis.

---

## 1. Qual problema o SubtitleMe resolve?

O player nativo do Stremio exibe apenas **uma faixa de legenda por vez**. Para estudar um idioma ou assistir a conteúdo em família com duas línguas simultâneas, o usuário normalmente precisa alternar manualmente entre legendas ou recorrer a serviços remotos que exigem cadastro ou expõem hábitos de visualização.

O SubtitleMe resolve isso localmente no seu computador: busca ou recebe duas legendas, sincroniza e combina ambos os idiomas em uma única faixa pronta para o Stremio Desktop, mantendo controle total sobre privacidade e aparência.

---

## 2. Funcionalidades disponíveis (`v1.0.1`)

- **37 idiomas suportados** com mapeamento BCP-47, ISO 639-2 e aliases nativos do Stremio (`Inglês`, `Português (Brasil)`, `Português (Portugal)`, `Espanhol`, `Francês`, `Alemão`, `Italiano`, `Japonês`, `Coreano`, `Chinês`, `Árabe`, `Russo`, `Holandês`, `Polonês`, `Turco`, entre outros).
- **Motor multi-fonte configurável:**
  - **Local Companion Store** (arquivos `.srt` e `.vtt` enviados localmente via API autenticada, prioridade máxima).
  - **OpenSubtitles v3** (`opensubtitles-v3.strem.io`, ativo por padrão sem chave de API).
  - **Subtitle Sync** (`subtitlesync.stream`, opcional — prioriza faixas sincronizadas por frame).
  - **OpenSubtitles REST API v1** (opcional — requer chave de API oficial fornecida pelo usuário).
- **1 a 5 opções bilíngues ranqueadas no player** (ex.: `Dual EN+PT-BR 1 (Sync/OS) · 96%`), ordenadas pela taxa real de sobreposição e similaridade de release, publicadas nos dois idiomas selecionados.
- **Sincronização inteligente:** ancoragem bidirecional, correção de drift de FPS, trava **anti-flicker (`380ms`)** e offsets independentes (`±30.000ms`).
- **Modo Reveal (`0s` a `2s`):** atrasa a exibição da tradução reservando a altura vertical com `\u00A0` para evitar pulos na legenda principal.
- **Formatos adaptativos (`.ASS`, `.SRT` e `.VTT`):** `.ASS` estilizado com cores, escala de fonte (`28–68px`), fundo/contorno e altura vertical; modo **Branco SRT** para controle nativo de tamanho pelo player; e `.VTT` no modo clássico.
- **SubtitleMe Studio (`http://127.0.0.1:7000/configure`):** painel local em tema escuro minimalista com pré-visualização ao vivo e aplicação imediata sem reinstalar o addon.

---

## 3. Como funciona a arquitetura

```text
Stremio Desktop (mesmo computador)
        │  GET /manifest.json · GET /subtitles/:type/:id.json
        ▼
SubtitleMe Local Companion (127.0.0.1:7000 — exclusivo loopback)
  ├── SubtitleMe Studio (/configure) — configuração ao vivo + API local autenticada
  ├── Discovery & Matching — Local Store + provedores externos opcionais
  ├── Parser & Merger Compartilhados (@subtitleme/subtitle-parser + @subtitleme/subtitle-core)
  ├── Auto-Sync + Anti-Flicker + Modo Reveal
  └── Cache em Memória (tokens opacos 192-bit, TTL 15 min, max 200 itens / 20 MB)
        │  GET /generated/:token.(ass|srt|vtt)
        ▼
Player do Stremio exibe os dois idiomas simultaneamente
```

---

## 4. Requisitos

- **Node.js:** `>= 22.0.0` (ambiente principal validado na `v1.0.1`: **Windows 11 X64** com **Node.js `v24.19.0`**).
- **Player:** **Stremio Desktop** no mesmo computador (validado na versão **`5.0.28`**).
- **Rede:** necessária apenas para consultar provedores externos opcionais (OpenSubtitles v3, Subtitle Sync ou OpenSubtitles REST API v1). O servidor local **nunca** se expõe à rede local (`0.0.0.0` é bloqueado).

---

## 5. Instalação rápida (Stremio Addon `v1.0.1`)

- **Release oficial:** [v1.0.1 no GitHub](https://github.com/Marquinhus0/SubtitleMe/releases/tag/v1.0.1)
- **Download direto:** [`subtitleme-stremio-v1.0.1.tar.gz`](https://github.com/Marquinhus0/SubtitleMe/releases/download/v1.0.1/subtitleme-stremio-v1.0.1.tar.gz) · [Arquivo `.sha256`](https://github.com/Marquinhus0/SubtitleMe/releases/download/v1.0.1/subtitleme-stremio-v1.0.1.sha256)
- **SHA-256 esperado:** `ae0c27694b609c9585266af4a8f72f55a9e1412e78a58a1be2c6061a08b40e5d`

1. Baixe e extraia o pacote standalone `subtitleme-stremio-v1.0.1.tar.gz` em uma pasta local:
   ```powershell
   mkdir subtitleme-stremio
   tar -xzf subtitleme-stremio-v1.0.1.tar.gz -C subtitleme-stremio
   cd subtitleme-stremio
   ```
2. Inicie o Local Companion:
   - **Windows (recomendado):** `.\bin\start-companion.cmd`
   - **Linux:** `chmod +x ./bin/start-companion.sh && ./bin/start-companion.sh` *(veja limitações de validação em [docs/INSTALLATION.md](docs/INSTALLATION.md))*
3. Abra **`http://127.0.0.1:7000/configure`** no navegador.
4. Configure seus idiomas e clique em **Instalar no Stremio** (ou cole `http://127.0.0.1:7000/manifest.json` em **Stremio → Complementos → + Adicionar Complemento**).
5. Reproduza um filme ou episódio no Stremio Desktop e escolha a faixa `Dual ...` no menu de legendas.

Para instruções completas (Windows CMD/PowerShell, Linux, persistência opt-in e extensão Chrome), consulte o [Guia de Instalação](docs/INSTALLATION.md).

---

## 6. Formatos de legenda

| Formato | Entrada (Importação / Fontes) | Saída (Entrega ao Stremio) | Quando usar |
| :--- | :--- | :--- | :--- |
| **SRT (`.srt`)** | Suportado | Suportado (modo **Branco SRT**) | Quando você prefere controlar o tamanho e a aparência usando os controles nativos do Stremio. |
| **WebVTT (`.vtt`)** | Suportado | Suportado (modo clássico) | Compatibilidade padrão WebVTT com posicionamento vertical. |
| **ASS (`.ass`)** | — | Suportado (padrão estilizado) | Cores personalizadas, escala de fonte (`28–68px`) e caixa translúcida. Requer **Configurações › Reprodutor › Estilizar legendas ASS** ativado no Stremio Desktop. |

---

## 7. Segurança e privacidade

- **Exclusivo `127.0.0.1`:** recusa `0.0.0.0`, `::` e IPs de LAN.
- **Proteção contra DNS Rebinding, CSRF e CORS abusivo:** validação estrita de `Host` e `Origin`, token efêmero de sessão de `256` bits (`timingSafeEqual`, TTL `12h`), cabeçalho `X-SubtitleMe-CSRF: 1` e separação rigorosa entre rotas administrativas (`/companion/*`) e protocolo Stremio.
- **Sem scraping e sem telemetria:** zero contas, zero analytics, zero envio de arquivos locais do usuário para terceiros.
- **Persistência opcional transparente:** desabilitada por padrão (somente memória). Quando ativada voluntariamente (`SUBTITLEME_PERSISTENCE=1`), os arquivos ficam no perfil local do usuário **sem criptografia em repouso** (`encryptedAtRest: false`).

Detalhes completos em [docs/PRIVACY_AND_SECURITY.md](docs/PRIVACY_AND_SECURITY.md).

---

## 8. Limitações conhecidas

- **Windows 11 X64** é a plataforma primária validada na `v1.0.1` (Stremio Desktop `5.0.28`, Node.js `v24.19.0`).
- **Linux** teve a instalação limpa do Companion CLI validada em RCs anteriores (Node.js `v22.23.5`), porém a renderização visual no Stremio Desktop Linux não foi validada; **macOS não foi validado**.
- **Android, Android TV, Google TV, Smart TVs e iOS não são suportados**, pois o Companion opera exclusivamente em `127.0.0.1`.
- **Stremio Web (`https://web.stremio.com`)** só funciona no mesmo computador com navegador que suporte Private Network Access (PNA) para `http://127.0.0.1`.
- **Extensão Chrome (`v1.0.0 RC`) e Stremio Addon (`v1.0.1` GA) são independentes** e não compartilham automaticamente arquivos salvos no IndexedDB do navegador.

---

## 9. Solução rápida de problemas

- **Porta `7000` ocupada:** defina `PORT=7001` antes de iniciar o Companion e use `http://127.0.0.1:7001/manifest.json` no Stremio.
- **Cores não aparecem no Stremio:** ative **Configurações › Reprodutor › Estilizar legendas ASS** no Stremio Desktop.
- **Legenda fora de sincronia:** selecione `Dual ... 2` ou `3` no menu de legendas do Stremio ou ajuste os offsets em `/configure`.

Veja todas as respostas em [docs/FAQ.md](docs/FAQ.md).

---

## 10. Estrutura do Monorepo e Desenvolvimento

```text
apps/
  stremio-addon/       # Stremio Addon + Local Companion v1.0.1 (Node.js 22+ + Stremio SDK)
  chrome-extension/    # Chrome Manifest V3 extension v1.0.0 RC (Vue 3 + Pinia + Tailwind + Vite)
  landing-page/        # Landing page estática para GitHub Pages (Vue 3 + TypeScript + Vite)
assets/
  brand/               # Logotipos oficiais SVG e ícone do aplicativo (Obsidian + Emerald/Mint)
  marketing/           # Banner social GitHub e materiais visuais de apresentação
packages/
  shared-types/        # Contratos TypeScript compartilhados
  subtitle-parser/     # Parser SRT e WebVTT independente de navegador
  subtitle-core/       # Track manager, busca binária e merger bilíngue
  subtitle-sync/       # Motor de sincronização (requestAnimationFrame)
  subtitle-renderer/   # Overlay Shadow DOM para extensão Chrome
  subtitle-storage/    # Persistência IndexedDB e settings da extensão Chrome
docs/                  # Guias de instalação, uso, privacidade, FAQ, marca, licença e auditorias
```

Comandos de desenvolvimento (requer Node.js `>= 22` e pnpm `>= 10`):

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

---

## 11. Apoie o projeto (Opcional)

O **SubtitleMe** é 100% gratuito e sem paywalls. Doações são **totalmente opcionais**, não desbloqueiam recursos exclusivos e nenhum dado financeiro é armazenado pelo projeto.

- Consulte opções e política de transparência em [docs/SUPPORT_AND_DONATIONS.md](docs/SUPPORT_AND_DONATIONS.md).

---

## 12. Licença

O código-fonte e os assets próprios do SubtitleMe são distribuídos sob a **Licença MIT** — consulte [LICENSE](LICENSE) e a auditoria de dependências de terceiros em [docs/LICENSE_AND_IP_AUDIT.md](docs/LICENSE_AND_IP_AUDIT.md). Avisos e licenças de dependências de terceiros permanecem preservados em seus respectivos pacotes.

---

## 13. Documentação complementar

- [Guia de Instalação (Windows, Linux e macOS)](docs/INSTALLATION.md)
- [Guia de Utilização (`v1.0.0`)](docs/USER_GUIDE.md)
- [Privacidade e Segurança](docs/PRIVACY_AND_SECURITY.md) · [Advisories Transitivos (`v1.0.0` → corrigidos na `v1.0.1`)](docs/SECURITY_ADVISORIES_V1_0_0.md)
- [Perguntas Frequentes e Troubleshooting (FAQ)](docs/FAQ.md)
- [Quickstart Operacional (pacote standalone)](apps/stremio-addon/QUICKSTART.md)
- [Identidade Visual e Diretrizes de Marca](docs/BRAND_IDENTITY.md) · [Apoio Voluntário](docs/SUPPORT_AND_DONATIONS.md)
- [Auditoria de Licença e Propriedade Intelectual (MIT)](docs/LICENSE_AND_IP_AUDIT.md)
- [Checklist de Lançamento Público](docs/PUBLIC_LAUNCH_CHECKLIST.md) · [Materiais de Lançamento](docs/LAUNCH_ANNOUNCEMENT.md)
- [Notas de Release (`v1.0.0 GA`)](docs/GA_RELEASE_NOTES.md) · [Changelog](docs/CHANGELOG.md)
- [Matriz de Compatibilidade](docs/GA_COMPATIBILITY_MATRIX.md) · [Auditoria de Segurança GA](docs/GA_SECURITY_AUDIT.md)
- [Arquitetura do Stremio Addon](docs/STREMIO_ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md)
