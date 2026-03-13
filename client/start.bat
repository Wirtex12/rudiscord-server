@echo off
setlocal enabledelayedexpansion

title Voxit Client
color 0B

echo.
echo ========================================
echo      VOXIT CLIENT (Electron + Vite)
echo ========================================
echo.

:: Check if package.json exists
if not exist "package.json" (
    color 0C
    echo [ERROR] package.json not found!
    echo Please run this from the client directory.
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
    echo.
)

echo ========================================
echo STEP 1: Compile Electron TypeScript
echo ========================================
echo.

call npm run electron:compile
if errorlevel 1 (
    color 0C
    echo.
    echo [ERROR] TypeScript compilation failed!
    echo Check the errors above.
    pause
    exit /b 1
)

echo [OK] TypeScript compiled successfully.
echo.

echo ========================================
echo STEP 2: Starting Vite Dev Server
echo ========================================
echo.
echo Starting Vite on http://localhost:5173
echo Please wait...
echo.

:: Start Vite in a separate window
start "Voxit Vite (port 5173)" cmd.exe /c "cd /d "%~dp0" && npm run vite"

:: Wait for Vite to start (30 seconds)
echo Waiting 30 seconds for Vite to initialize...
echo.

:: Check every 5 seconds if port 5173 is available
set /a attempts=0
:wait_loop
timeout /t 5 /nobreak >nul
set /a attempts+=1

:: Try to connect to port 5173
powershell -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('localhost', 5173); $tcp.Close(); exit 0 } catch { exit 1 }"
if errorlevel 0 (
    echo.
    echo [OK] Vite is ready! (attempt %attempts%)
    goto start_electron
)

if %attempts% GEQ 6 (
    color 0C
    echo.
    echo [ERROR] Vite failed to start after 30 seconds!
    echo.
    echo Troubleshooting:
    echo 1. Check if port 5173 is already in use
    echo 2. Run manually: npm run vite
    echo 3. Check the Vite window for errors
    echo.
    pause
    exit /b 1
)

echo Still waiting for Vite... (attempt %attempts%/6)
goto wait_loop

:start_electron
echo.
echo ========================================
echo STEP 3: Starting Electron
echo ========================================
echo.

:: Small delay to ensure Vite is fully ready
timeout /t 3 /nobreak >nul

:: Start Electron
call npm run electron

if errorlevel 1 (
    color 0C
    echo.
    echo [ERROR] Electron crashed!
    echo Check the console for errors.
    pause
    exit /b 1
)

echo.
echo [OK] Electron stopped.
echo.
echo NOTE: Vite is still running in the background.
echo Close the "Voxit Vite" window when done.
pause
