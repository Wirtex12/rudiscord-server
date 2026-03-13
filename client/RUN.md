# Voxit Client - Запуск

## Быстрый старт

### Вариант 1: Автоматический запуск (рекомендуется)

```bash
cd client
start.bat
```

**Что делает:**
1. Компилирует TypeScript → JavaScript
2. Запускает Vite dev server (порт 5173)
3. Ждёт 10 секунд
4. Запускает Electron

---

### Вариант 2: Ручной запуск (для отладки)

**Терминал 1 - Vite:**
```bash
cd client
npm run vite
```
⏳ Жди пока увидишь: `VITE v6.x.x ready in xxx ms`

**Терминал 2 - Electron:**
```bash
cd client
npm run electron:compile
npm run electron
```

---

## Скрипты npm

| Команда | Описание |
|---------|----------|
| `npm run vite` | Запуск Vite dev server |
| `npm run electron:compile` | Компиляция TypeScript |
| `npm run electron` | Запуск Electron (требует компиляции) |
| `npm run electron:dev` | Compile + Electron |
| `npm run build` | Production build |

---

## Структура запуска

```
start.bat
    ↓
1. npm run electron:compile
   → electron/main.ts → dist-electron/main.js
   → electron/preload.ts → dist-electron/preload.js
    ↓
2. Start Vite (background)
   → http://localhost:5173
    ↓
3. Wait 10 seconds
    ↓
4. npm run electron
   → Electron loads http://localhost:5173
```

---

## Отладка

### Проверка компиляции

```bash
npm run electron:compile
dir dist-electron
```

**Должны быть:**
- `dist-electron/main.js` ✓
- `dist-electron/preload.js` ✓

### Проверка Vite

```bash
npm run vite
```

**Открой браузер:** http://localhost:5173

Если React приложение загружается → Vite работает ✓

### Логи Electron

При запуске ты увидишь:

```
[Electron] === App Starting ===
[Electron] Node version: v20.x.x
[Electron] Electron version: 34.x.x
[Electron] === App Ready ===
[Electron] Creating window...
[Electron] Mode: Development
[Electron] Loading Vite dev server: http://localhost:5173
[Electron] Window created successfully
[Electron] Page loaded successfully  ← УСПЕХ!
```

### Ошибки

**ERR_CONNECTION_REFUSED:**
```
[Electron] Load failed: -102 ERR_CONNECTION_REFUSED
```

**Решение:**
1. Убедись что Vite запущен
2. Проверь порт: `netstat -ano | findstr :5173`
3. Перезапусти Vite

**Cannot find module 'preload.js':**
```
Error: Cannot find module '...\preload.js'
```

**Решение:**
```bash
npm run electron:compile
```

**Window closes immediately:**
1. Проверь логи Electron
2. Проверь что Vite доступен
3. Запусти вручную по шагам (Вариант 2)

---

## Полный сброс

```bash
cd client

:: Удалить скомпилированные файлы
rmdir /s /q dist-electron

:: Удалить зависимости
rmdir /s /q node_modules

:: Очистить кэш
npm cache clean --force

:: Установить заново
npm install

:: Компилировать
npm run electron:compile

:: Запустить
start.bat
```

---

## Проверка работы

1. ✅ Vite запущен (порт 5173)
2. ✅ Electron компилируется без ошибок
3. ✅ DevTools открываются автоматически
4. ✅ Видна форма входа Voxit
5. ✅ Нет ошибок в консоли

## DevTools

**Открыть:** `Ctrl+Shift+I`

**Проверить:**
- Console → ошибки JavaScript
- Network → запросы к серверу
- Elements → DOM структура

---

## Сервер

Не забудь запустить сервер:

```bash
cd ..\server
npm run start:dev
```

**Порт:** 3000
