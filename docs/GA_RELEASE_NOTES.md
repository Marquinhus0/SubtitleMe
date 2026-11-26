# SubtitleMe Stremio Addon — Release Notes (`v1.0.0 GA`)

> **Status da Release (2026-11-26):** **`1.0.0 GA`** preparada e validada localmente (pronta para commit/distribuição após autorização explícita).  
> **Artefato Oficial GA:** `dist/release/subtitleme-stremio-v1.0.0.tar.gz` (`2.476.194` bytes · `5.629` arquivos)  
> **SHA-256 (`1.0.0`):** `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd`  
> **RC Anterior Preservado (`1.0.0-rc.8`):** `c1411b7fd8897e6c0b66b91b3863f32136668481a31a0b8c03fd84c794f88450`

---

## Destaques Técnicos Consolidados até `1.0.0-rc.8`

### 1. Motor Bilíngue Multi-Fonte e Multi-Par
- **Descoberta combinada de legendas:** integração entre **Subtitle Sync** (`subtitlesync.stream`, filtrando automaticamente faixas não sincronizadas), **Stremio OpenSubtitles v3** (ilimitado, sem chave, preservando a cota diária da API v1), **OpenSubtitles REST API v1** (matching oficial por `moviehash` + cache de downloads de 15 minutos) e armazenamento local opcional do Companion.
- **37 idiomas suportados:** mapeamento completo de códigos BCP-47, ISO 639-2 e aliases nativos do Stremio (`pob`, `por`, `eng`, `spa`, `fre`, `ger`, `ita`, `jpn`, `kor`, `chi`, `rus`, `tur`, `ara`, `dut`, `pol`, `swe`, entre outros).
- **1 a 5 opções ranqueadas no player:** seleção de pares distintos por similaridade de release (`WEB-DL`, `BluRay`, grupo) ordenados pela porcentagem real de sobreposição das falas e publicados simultaneamente sob o idioma nativo e o idioma de estudo no menu do Stremio.
- **Roteamento de fonte por idioma:** escolha independente (`Auto`, `Sync`, `OpenSub`) para cada idioma.

### 2. Sincronização Inteligente e Modo de Aprendizado Reveal
- **Ancoragem bidirecional + regressão linear de drift:** identifica qual faixa está ancorada ao vídeo e corrige automaticamente diferenças de corte/introdução e derivações de FPS (`23.976` ↔ `24` ↔ `25`).
- **Proteção anti-flicker (`380ms`):** alinha micro-diferenças de início e fim entre as duas línguas no mesmo milissegundo.
- **Modo Reveal (`0s` a `2s`) sem pulo vertical:** atrasa a exibição da tradução reservando a altura exata das linhas com espaço não-quebrável (`\u00A0`), evitando que a linha principal se desloque na tela.

### 3. Renderização Adaptativa (`.ASS` / `.SRT` / `.VTT`) & SubtitleMe Studio
- **Entrega inteligente `.ASS` vs `.SRT`:** gera `.ass` estilizado quando cores personalizadas, escala de fonte (`28–68px`), caixa translúcida ou altura customizada estão ativas, e alterna automaticamente para `.srt` limpo no modo `Branco SRT` para uso dos controles nativos do Stremio.
- **SubtitleMe Studio (`/configure`):** painel autoral escuro minimalista em paleta verde esmeralda/menta (`#10B981` / `#34D399`) com linhas finas, monitor widescreen interativo, diagnóstico ao vivo das fontes e aplicação instantânea em tempo real (`RuntimeSettingsStore`) sem reinstalar o addon.

---

## Escopo de Compatibilidade Declarado

- **Windows 11 X64 (`Node.js 22+` + `bin\start-companion.cmd`):** Companion local e suíte HTTP/funcional testados; validação visual formal arquivada no Stremio Desktop `5.0.28` pendente de anexação para promoção GA.
- **Linux (`bin/start-companion.sh`) / macOS:** não reexecutado na `rc.8` (Linux testado até `rc.1`; macOS não testado).
- **Android / Android TV / iOS / Smart TVs:** **não suportados** devido à arquitetura de segurança exclusivamente local em `127.0.0.1`.

---

## Limitações Conhecidas e Segurança

- Servidor restrito exclusivamente a `127.0.0.1` (bloqueia `0.0.0.0` e LAN), protegido por validação de `Host` contra DNS rebinding, `Origin` loopback, token efêmero de 256 bits e cabeçalho CSRF.
- Para visualizar cores e tamanhos `.ASS` no Stremio Desktop, a opção **Configurações › Reprodutor › Estilizar legendas ASS** deve estar habilitada no player.
- Quando a persistência opcional em disco (`SUBTITLEME_PERSISTENCE=1`) é ativada, configurações e chaves opcionais ficam salvas localmente no diretório privado do perfil do usuário sem criptografia em repouso (`encryptedAtRest: false`).
