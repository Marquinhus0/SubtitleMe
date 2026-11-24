# SubtitleMe Local Companion Launcher (Windows PowerShell)
# Runs strictly in the foreground on 127.0.0.1 (never exposes LAN, never installs background services).
#
# ExecutionPolicy Note:
#   Default Windows PowerShell uses ExecutionPolicy=Restricted (all scopes Undefined), which blocks
#   unsigned .ps1 scripts with PSSecurityException (UnauthorizedAccess). Do NOT change global
#   ExecutionPolicy. Safe ways to start the Companion on Windows without altering system policy:
#     1) Run .\bin\start-companion.cmd (recommended on default Windows — no PowerShell policy friction)
#     2) Run: node .\dist\index.mjs
#     3) If permitted by local policy, run process-scoped PowerShell:
#        powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\bin\start-companion.ps1"

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AddonDir = (Resolve-Path -LiteralPath (Join-Path $ScriptDir "..")).Path
$DistEntry = Join-Path $AddonDir "dist\index.mjs"

$RepoRoot = $null
$CandidateRepoRoot = Join-Path $AddonDir "..\.."
if (Test-Path -LiteralPath "$CandidateRepoRoot") {
  $RepoRoot = (Resolve-Path -LiteralPath "$CandidateRepoRoot").Path
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "[SubtitleMe] Node.js 22+ is required but was not found in PATH. Install from https://nodejs.org and try again."
  exit 1
}

$NodeMajor = [int](& node -p "process.versions.node.split('.')[0]")
if ($LASTEXITCODE -ne 0 -or $NodeMajor -lt 22) {
  $NodeVer = (& node -v)
  Write-Error "[SubtitleMe] Node.js 22+ is required (found $NodeVer)."
  exit 1
}

if (-not (Test-Path -LiteralPath "$DistEntry")) {
  if (
    $RepoRoot -and
    (Get-Command pnpm -ErrorAction SilentlyContinue) -and
    (Test-Path -LiteralPath (Join-Path "$RepoRoot" "pnpm-workspace.yaml"))
  ) {
    Write-Host "[SubtitleMe] Building Local Companion bundle..."
    & pnpm --dir "$RepoRoot" --filter "@subtitleme/stremio-addon" build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } else {
    Write-Error "[SubtitleMe] Built bundle not found at $DistEntry. Extract the full release archive or run 'pnpm build' first."
    exit 1
  }
}

if (-not $env:PORT) {
  $env:PORT = "7000"
}

$ParsedPort = 0
if (-not [int]::TryParse($env:PORT, [ref]$ParsedPort) -or $ParsedPort -lt 1 -or $ParsedPort -gt 65535) {
  Write-Error "[SubtitleMe] Invalid PORT '$($env:PORT)'. Set PORT to an integer between 1 and 65535."
  exit 1
}

Write-Host "[SubtitleMe] Starting Local Companion on http://127.0.0.1:$($env:PORT) (Launcher PID $PID)..."
Write-Host "[SubtitleMe] Press Ctrl+C to stop gracefully."

& node "$DistEntry"
$ExitCode = $LASTEXITCODE
if ($ExitCode -ne 0) {
  Write-Host "[SubtitleMe] Companion exited with code $ExitCode." -ForegroundColor Yellow
}
exit $ExitCode
