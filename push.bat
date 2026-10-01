@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo   SteamCN site  -  push to GitHub Pages
echo ==============================================
echo   (export content.json into this folder first, if you have one)
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [FAIL] git not found in PATH. Install Git for Windows first.
  pause
  exit /b 1
)

set "MSG=%~1"
if "%MSG%"=="" set "MSG=deploy: %date% %time%"

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" set "PS=powershell"

echo [1/3] cache stamp ...
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\stamp.ps1"
if errorlevel 1 echo       [warn] stamp failed, continuing anyway

echo [2/3] commit ...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%MSG%"
  if errorlevel 1 (
    echo       [FAIL] commit failed. Copy the message above for help.
    pause
    exit /b 1
  )
) else (
  echo       no file changes, push only
)

echo [3/3] push ...
git push -u origin main
if errorlevel 1 (
  echo.
  echo [FAIL] push failed. Usual cause: cannot reach GitHub.
  echo        Turn on your proxy / accelerator, then run this file again.
  pause
  exit /b 1
)

echo.
echo Done. GitHub Pages rebuilds in about 1-2 minutes.
echo If the page still looks unchanged, press Ctrl+Shift+R once.
echo.
pause
