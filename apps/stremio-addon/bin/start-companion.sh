#!/usr/bin/env bash
set -euo pipefail

# SubtitleMe Local Companion Launcher (Linux)
# Runs strictly in the foreground on 127.0.0.1 (never exposes LAN, never installs background daemons).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADDON_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${ADDON_DIR}/../.." && pwd)"
DIST_ENTRY="${ADDON_DIR}/dist/index.mjs"

if ! command -v node >/dev/null 2>&1; then
  echo "[SubtitleMe] Error: Node.js 22+ is required but was not found in PATH." >&2
  echo "[SubtitleMe] Install Node.js 22+ from https://nodejs.org and try again." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 22 ]; then
  echo "[SubtitleMe] Error: Node.js 22+ is required (found v$(node -v))." >&2
  exit 1
fi

if [ ! -f "${DIST_ENTRY}" ]; then
  if command -v pnpm >/dev/null 2>&1 && [ -f "${REPO_ROOT}/pnpm-workspace.yaml" ]; then
    echo "[SubtitleMe] Building Local Companion bundle..."
    pnpm --dir "${REPO_ROOT}" --filter @subtitleme/stremio-addon build
  else
    echo "[SubtitleMe] Error: Built bundle not found at ${DIST_ENTRY}. Run 'pnpm build' first." >&2
    exit 1
  fi
fi

PORT="${PORT:-7000}"
export PORT

echo "[SubtitleMe] Starting Local Companion on http://127.0.0.1:${PORT} ..."
echo "[SubtitleMe] Press Ctrl+C to stop gracefully."

exec node "${DIST_ENTRY}"
