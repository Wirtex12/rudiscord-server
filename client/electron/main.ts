import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

// ============================================
// AUTO-UPDATER CONFIGURATION
// ============================================

// Настройки autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;
autoUpdater.allowPrerelease = false;

// Включаем логирование для отладки
autoUpdater.logger = {
  debug: (msg: string) => console.log('[AutoUpdater] DEBUG:', msg),
  info: (msg: string) => console.log('[AutoUpdater] INFO:', msg),
  warn: (msg: string) => console.warn('[AutoUpdater] WARN:', msg),
  error: (msg: string) => console.error('[AutoUpdater] ERROR:', msg),
};

// ============================================
// WINDOW CREATION
// ============================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    title: 'Voxit',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: process.env.NODE_ENV === 'development',
    },
    icon: path.join(__dirname, 'icon.png'),
  });

  // ✅ ПРАВИЛЬНАЯ ПРОВЕРКА: production или development
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development mode: загружаем с Vite dev server
    console.log('🔧 Development mode - loading from Vite dev server');
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: загружаем из dist/index.html
    console.log('📦 Production mode - loading from dist/index.html');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Блокируем внешние навигации
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// ============================================
// AUTO-UPDATER EVENT HANDLERS
// ============================================

function setupAutoUpdater() {
  // Проверка обновлений
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] 🔍 Checking for updates...');
    mainWindow?.webContents.send('update-checking');
  });

  // Обновление доступно
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] ✅ Update available:', info.version);
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  // Обновлений нет
  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] ⭕ No updates available');
    mainWindow?.webContents.send('update-not-available');
  });

  // Прогресс загрузки
  autoUpdater.on('download-progress', (progress) => {
    console.log('[AutoUpdater] 📥 Download progress:', progress.percent, '%');
    mainWindow?.webContents.send('update-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  // Обновление загружено
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] ✅ Update downloaded:', info.version);
    
    // Показываем диалог пользователю
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded!`,
      detail: 'Do you want to restart the application to apply the update?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        console.log('[AutoUpdater] 🔄 Restarting application...');
        autoUpdater.quitAndInstall();
      } else {
        console.log('[AutoUpdater] ⏸️ User chose to restart later');
        mainWindow?.webContents.send('update-ready', {
          version: info.version,
        });
      }
    });
  });

  // Ошибка
  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] ❌ Update error:', err.message);
    mainWindow?.webContents.send('update-error', {
      message: err.message,
    });
  });
}

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(() => {
  console.log('[Electron] === App Ready ===');
  createWindow();
  setupAutoUpdater();

  // Проверяем обновления через 2 секунды после запуска
  setTimeout(() => {
    console.log('[AutoUpdater] 🚀 Starting update check...');
    autoUpdater.checkForUpdates();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Закрываем приложение когда все окна закрыты (кроме macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================
// IPC HANDLERS
// ============================================

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Ручная проверка обновлений
ipcMain.on('check-for-updates', () => {
  console.log('[IPC] Manual update check requested');
  autoUpdater.checkForUpdates();
});

// Принудительный перезапуск
ipcMain.on('quit-and-install', () => {
  console.log('[IPC] Quit and install requested');
  autoUpdater.quitAndInstall();
});

// Управление окном
ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// ============================================
// EXPORTS
// ============================================

export { mainWindow };
