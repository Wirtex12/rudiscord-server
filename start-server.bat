@echo off
title Voxit Server
color 0A

echo ========================================
echo    Voxit Server - Starting...
echo ========================================
echo.

cd /d "%~dp0server"
npm run start:dev

pause
