# SubtitleMe Stremio Addon `v1.0.0` — Informações de Release e Verificação de Integridade

> **Status de Distribuição:** Preparação interna concluída — **nenhum link público de download foi publicado nesta sprint**.

---

## 1. Metadados Oficiais do Artefato GA

| Campo | Valor Oficial |
| :--- | :--- |
| **Produto** | SubtitleMe Stremio Addon + Local Companion |
| **Pacote npm** | `@subtitleme/stremio-addon` |
| **Versão** | `1.0.0` |
| **Tag Git** | `v1.0.0` |
| **Commit** | `b546fc7a1590650246c3e5add923965275045d21` |
| **Nome do arquivo** | `subtitleme-stremio-v1.0.0.tar.gz` |
| **Tamanho real** | `2.476.194` bytes (`~2,36 MB`) · `5.629` arquivos |
| **SHA-256** | `7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd` |

---

## 2. Requisitos Mínimos

- **Node.js:** `>= 22.0.0` (validado em Windows 11 X64 com Node.js `v24.19.0` e em Linux X64 com Node.js `v22.23.5`).
- **Stremio Desktop:** instalado no mesmo computador (validado na versão `5.0.28` no Windows 11).
- **Dependências extras:** nenhuma (`node_modules/` já vem empacotado dentro do tarball; Docker não é necessário).

---

## 3. Como Verificar a Integridade (SHA-256)

Antes de extrair o pacote, compare o hash SHA-256 do arquivo baixado com o hash oficial acima:

### Windows (PowerShell)
```powershell
Get-FileHash -Algorithm SHA256 .\subtitleme-stremio-v1.0.0.tar.gz
```
O campo `Hash` deve ser exatamente:
```text
7F298F2B792615EC8AE476FDF7D8E0AC35FA4AE494D25D945AD74313913261FD
```

### Linux
```bash
sha256sum subtitleme-stremio-v1.0.0.tar.gz
```
A saída deve iniciar exatamente com:
```text
7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd
```

Se o hash for diferente, **não execute o pacote** e obtenha uma nova cópia oficial.

---

## 4. Local Recomendado de Extração

- **Windows:** uma pasta simples dentro do seu perfil de usuário, por exemplo `C:\Users\<SeuUsuario>\SubtitleMe` (caminhos com espaços também são suportados pelos launchers).
- **Linux:** uma pasta dentro da sua home, por exemplo `~/subtitleme-stremio`.

```powershell
# Windows
mkdir "$env:USERPROFILE\SubtitleMe"
tar -xzf subtitleme-stremio-v1.0.0.tar.gz -C "$env:USERPROFILE\SubtitleMe"
cd "$env:USERPROFILE\SubtitleMe"
.\bin\start-companion.cmd
```

```bash
# Linux
mkdir -p ~/subtitleme-stremio
tar -xzf subtitleme-stremio-v1.0.0.tar.gz -C ~/subtitleme-stremio
cd ~/subtitleme-stremio
chmod +x ./bin/start-companion.sh
./bin/start-companion.sh
```
