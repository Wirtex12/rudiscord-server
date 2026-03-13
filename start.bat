@echo off
setlocal enabledelayedexpansion

:: ============================================
:: Voxit - Complete Project Launcher
:: ============================================

title Voxit Launcher
color 0A

echo.
echo ========================================
echo          VOXIT LAUNCHER
echo ========================================
echo.
echo Starting Voxit Messenger...
echo.

:: Check if server directory exists
if not exist "server\package.json" (
    color 0C
    echo [ERROR] Server directory not found!
    echo Please ensure you're running this from the Voxit root directory.
    pause
    exit /b 1
)

:: Check if client directory exists
if not exist "client\package.json" (
    color 0C
    echo [ERROR] Client directory not found!
    echo Please ensure you're running this from the Voxit root directory.
    pause
    exit /b 1
)

echo [OK] Directories found.
echo.
echo Starting Server (NestJS) on port 3000...
echo Starting Client (Electron + Vite) on port 5173...
echo.

:: Start server in new window
start "Voxit Server" cmd.exe /c "cd /d "%~dp0server" && echo ^[^OK^] Server starting... && npm run start:dev"

:: Wait for server to start (10 seconds)
echo Waiting for server to initialize (8 seconds)...
timeout /t 8 /nobreak >nul

:: Start client in new window
start "Voxit Client" cmd.exe /c "cd /d "%~dp0client" && echo ^[^OK^] Client starting... && npm run electron:dev"

echo.
echo ========================================
echo          VOXIT STARTED
echo ========================================
echo.
echo Server: http://localhost:3000
echo Client: Electron window (port 5173)
echo.
echo Press any key to exit this window...
echo (Server and Client will continue running)
echo ========================================
echo.

pause >nul
exit /b 0
