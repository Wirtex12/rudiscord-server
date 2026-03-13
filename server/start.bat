@echo off
setlocal enabledelayedexpansion

:: ============================================
:: Voxit Server Launcher
:: ============================================

title Voxit Server
color 0A

echo.
echo ========================================
echo       VOXIT SERVER (NestJS)
echo ========================================
echo.
echo Starting NestJS server on port 3000...
echo.

:: Check if package.json exists
if not exist "package.json" (
    color 0C
    echo [ERROR] package.json not found!
    echo Please run this from the server directory.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    color 0E
    echo [WARNING] node_modules not found!
    echo Installing dependencies...
    echo.
    call npm install
    if errorlevel 1 (
        color 0C
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed.
    echo.
)

:: Start the server
echo [OK] Starting server...
echo.
call npm run start:dev

if errorlevel 1 (
    color 0C
    echo.
    echo [ERROR] Server crashed or stopped with errors!
    echo Check the logs above for details.
    pause
    exit /b 1
)

echo.
echo [OK] Server stopped.
pause
