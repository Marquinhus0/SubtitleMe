@echo off
setlocal EnableExtensions

REM SubtitleMe Local Companion Launcher (Windows Command Prompt)
REM Runs strictly in the foreground on 127.0.0.1 (never exposes LAN, never installs background services).
REM Works on default Windows installations without requiring PowerShell ExecutionPolicy changes.

chcp 65001 >nul 2>&1

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ADDON_DIR=%%~fI"
set "DIST_ENTRY=%ADDON_DIR%\dist\index.mjs"

where node >nul 2>&1
if errorlevel 1 (
  echo [SubtitleMe] Error: Node.js 22+ is required but was not found in PATH. Install from https://nodejs.org and try again. 1>&2
  exit /b 1
)

for /f "delims=" %%V in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR (
  echo [SubtitleMe] Error: Failed to determine Node.js version. 1>&2
  exit /b 1
)
if %NODE_MAJOR% LSS 22 (
  for /f "delims=" %%F in ('node -v') do set "NODE_FULL=%%F"
  echo [SubtitleMe] Error: Node.js 22+ is required ^(found %NODE_FULL%^). 1>&2
  exit /b 1
)

if not exist "%DIST_ENTRY%" (
  echo [SubtitleMe] Error: Built bundle not found at "%DIST_ENTRY%". Extract the full release archive or run pnpm build first. 1>&2
  exit /b 1
)

if not defined PORT set "PORT=7000"

echo [SubtitleMe] Starting Local Companion on http://127.0.0.1:%PORT% ...
echo [SubtitleMe] Press Ctrl+C to stop gracefully.

node "%DIST_ENTRY%"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo [SubtitleMe] Companion exited with code %EXIT_CODE%. 1>&2
)
exit /b %EXIT_CODE%
