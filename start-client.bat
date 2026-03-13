@echo off
chcp 65001 >nul
color 0B

echo ╔════════════════════════════════════════════════════════╗
echo ║              🎤 VOXIT CLIENT                           ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [1/4] Компиляция Electron...
call npm run electron:compile
if errorlevel 1 (
    echo ❌ Ошибка компиляции!
    pause
    exit /b 1
)

echo [2/4] Запуск Vite dev server...
start "Voxit Vite" cmd /k "cd /d %~dp0 && npm run dev"

echo [3/4] Ожидание запуска Vite (5 секунд)...
timeout /t 5 /nobreak >nul

echo [4/4] Запуск Electron...
echo.

REM Проверяем что Vite доступен
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo ❌ Vite не запустился! Проверь порт 5173.
    pause
    exit /b 1
)

start "Voxit Electron" cmd /k "cd /d %~dp0 && npm run electron"

echo.
echo ✅ Клиент запущен!
echo.
echo Окна:
echo   - Voxit Vite (Vite dev server)
echo   - Voxit Electron (Приложение)
echo.
pause >nul