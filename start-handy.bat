@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte von https://nodejs.org installieren.
  pause
  exit /b 1
)
echo Das Spiel ist jetzt auch fuer Geraete im selben WLAN erreichbar.
echo Die Adresse fuer das Handy steht gleich unten.
node serve.mjs --lan --open
pause
