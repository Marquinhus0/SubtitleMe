# SubtitleMe Local Companion Launcher (Windows PowerShell)
# Runs strictly in the foreground on 127.0.0.1 (never exposes LAN, never installs background services).
# Note: Native Windows execution is documented here and marked Not Evaluated until tested on Windows.

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AddonDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$RepoRoot = (Resolve-Path (Join-Path $AddonDir "..\..")).Path
$DistEntry = Join-Path $AddonDir "dist\index.mjs"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "[SubtitleMe] Node.js 22+ is required but was not found in PATH. Install from https://nodejs.org and try again."
  exit 1
}

$NodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($NodeMajor -lt 22) {
  $NodeVer = (node -v)
  Write-Error "[SubtitleMe] Node.js 22+ is required (found $NodeVer)."
  exit 1
}

if (-not (Test-Path -LiteralPath "$DistEntry")) {
  if ((Get-Command pnpm -ErrorAction SilentlyContinue) -and (Test-Path -LiteralPath (Join-Path $RepoRoot "pnpm-workspace.yaml"))) {
    Write-Host "[SubtitleMe] Building Local Companion bundle..."
    & pnpm --dir "$RepoRoot" --filter "@subtitleme/stremio-addon" build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } else {
    Write-Error "[SubtitleMe] Built bundle not found at $DistEntry. Run 'pnpm build' first."
    exit 1
  }
}

if (-not $env:PORT) {
  $env:PORT = "7000"
}

Write-Host "[SubtitleMe] Starting Local Companion on http://127.0.0.1:$($env:PORT) ..."
Write-Host "[SubtitleMe] Press Ctrl+C to stop gracefully."

& node "$DistEntry"
exit $LASTEXITCODE
