import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';

const PROTOCOL = 'voxit';
const VITE_DEV_SERVER_URL = 'http://localhost:5173';
const FALLBACK_PORT = 5174;

let mainWindow: BrowserWindow | null = null;
let updateWindow: BrowserWindow | null = null;
let deepLinkUrl: string | null = null;

// Auto-updater configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.autoRunAppAfterInstall = true;

// Enable logging for debugging
autoUpdater.logger = {
  debug: (msg: string) => console.log('[AutoUpdater] DEBUG:', msg),
  info: (msg: string) => console.log('[AutoUpdater] INFO:', msg),
  warn: (msg: string) => console.warn('[AutoUpdater] WARN:', msg),
  error: (msg: string) => console.error('[AutoUpdater] ERROR:', msg),
};

function checkViteAvailability(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const http = require('http');
    http.get(url, (res: any) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

function createUpdateWindow(): void {
  updateWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  updateWindow.loadFile(path.join(__dirname, 'update-window.html'));
  updateWindow.center();
}

async function createWindow(): Promise<void> {
  console.log('[Electron] === Creating Window ===');

  // Create update window first
  createUpdateWindow();

  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      show: false, // Hide until update check completes
      backgroundColor: '#23272a',
    });

    console.log('[Electron] Window created');

    Menu.setApplicationMenu(null);

    const isDev = process.env.NODE_ENV !== 'production';
    console.log('[Electron] Mode:', isDev ? 'Development' : 'Production');

    if (isDev) {
      console.log('[Electron] Checking Vite availability...');

      const viteAvailable = await checkViteAvailability(VITE_DEV_SERVER_URL);

      if (!viteAvailable) {
        console.error('[Electron] Vite NOT available at', VITE_DEV_SERVER_URL);

        const fallbackAvailable = await checkViteAvailability(`http://localhost:${FALLBACK_PORT}`);

        if (fallbackAvailable) {
          console.log('[Electron] Using fallback port:', FALLBACK_PORT);
          await mainWindow.loadURL(`http://localhost:${FALLBACK_PORT}`);
        } else {
          console.error('[Electron] Vite not available on any port');
          dialog.showErrorBox(
            'Vite Not Running',
            `Cannot connect to Vite dev server.\n\nPort ${VITE_DEV_SERVER_URL} is not available.\n\nPlease start Vite:\nnpm run dev\n\nThen restart Electron.`
          );
          await mainWindow.loadURL(VITE_DEV_SERVER_URL);
        }
      } else {
        console.log('[Electron] ✓ Vite is available, loading...');
        await mainWindow.loadURL(VITE_DEV_SERVER_URL);
        console.log('[Electron] ✓ loadURL completed');
      }

      // Open DevTools automatically
      console.log('[Electron] Opening DevTools automatically (press F12 to toggle)');
      if (mainWindow) {
        mainWindow.webContents.openDevTools();
      }

      // Add F12 shortcut to toggle DevTools
      mainWindow.webContents.on('before-input-event', (_event, input) => {
        if (input.key === 'F12' && input.type === 'keyDown') {
          if (mainWindow?.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
            console.log('[Electron] DevTools closed');
          } else {
            mainWindow?.webContents.openDevTools();
            console.log('[Electron] DevTools opened');
          }
        }
      });

      // Log when page loads
      mainWindow.webContents.on('did-finish-load', () => {
        console.log('[Electron] ✓✓✓ PAGE LOADED SUCCESSFULLY ✓✓✓');
        console.log('[Electron] Current URL:', mainWindow?.webContents.getURL());
      });

      // Log load failures
      mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        console.error('[Electron] ✗✗✗ PAGE LOAD FAILED ✗✗✗');
        console.error('[Electron] Error code:', errorCode);
        console.error('[Electron] Error description:', errorDescription);

        if (errorCode === -102) {
          // ERR_CONNECTION_REFUSED
          dialog.showErrorBox(
            'Connection Refused',
            `Cannot connect to Vite dev server at ${VITE_DEV_SERVER_URL}\n\n` +
              `Please ensure:\n` +
              `1. Vite is running (npm run dev)\n` +
              `2. Port 5173 is not blocked\n\n` +
              `Error: ${errorDescription}`
          );
        }
      });
    } else {
      console.log('[Electron] Loading production build');
      const indexPath = path.join(__dirname, '../dist/index.html');
      console.log('[Electron] Path:', indexPath);

      try {
        await mainWindow.loadFile(indexPath);
        console.log('[Electron] ✓ Production build loaded');

        mainWindow.once('ready-to-show', () => {
          mainWindow?.show();
          mainWindow?.focus();
        });
      } catch (err) {
        console.error('[Electron] loadFile error:', err);
        dialog.showErrorBox(
          'Build Error',
          `Cannot find index.html\n\nPath: ${indexPath}\n\nError: ${(err as Error).message}`
        );
      }
    }

    mainWindow.on('closed', () => {
      console.log('[Electron] Window closed');
      mainWindow = null;
    });

    console.log('[Electron] === Window Setup Complete ===');
  } catch (error) {
    console.error('[Electron] Error creating window:', error);
    dialog.showErrorBox(
      'Window Creation Error',
      `Failed to create Electron window\n\nError: ${(error as Error).message}`
    );
  }
}

// Register protocol handler
function registerProtocol(): void {
  console.log('[Electron] Registering protocol:', PROTOCOL);
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
      console.log('[Electron] Protocol registered via defaultApp');
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
    console.log('[Electron] Protocol registered directly');
  }
}

// Handle deep link on Windows (second instance)
function handleSecondInstance(_event: Electron.Event, argv: string[]): void {
  console.log('[Electron] Second instance detected');
  if (process.platform === 'win32') {
    deepLinkUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`)) || null;

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      if (deepLinkUrl) {
        console.log('[Electron] Sending deep link to main window:', deepLinkUrl);
        mainWindow.webContents.send('deep-link', deepLinkUrl);
      }
    }
  }
}

// Handle deep link on macOS (open-url)
function handleOpenUrl(_event: Electron.Event, url: string): void {
  console.log('[Electron] Open URL:', url);
  if (url.startsWith(`${PROTOCOL}://`)) {
    deepLinkUrl = url;

    if (mainWindow) {
      console.log('[Electron] Sending deep link:', deepLinkUrl);
      mainWindow.webContents.send('deep-link', deepLinkUrl);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  }
}

// Handle deep link on Windows/Linux (argv)
function handleDeepLinkFromArgv(): void {
  const url = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (url) {
    console.log('[Electron] Deep link from argv:', url);
    deepLinkUrl = url;
  }
}

// ============================================
// AUTO-UPDATE FUNCTIONS
// ============================================

function checkForUpdates(): void {
  console.log('[AutoUpdater] 🔍 Checking for updates...');

  if (updateWindow) {
    updateWindow.webContents.send('update-status', {
      status: 'checking',
      message: 'Checking for updates...',
      progress: 0,
    });
  }

  autoUpdater.checkForUpdates();
}

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] 🔍 Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] ✅ Update available:', info.version);

  if (updateWindow) {
    updateWindow.webContents.send('update-status', {
      status: 'downloading',
      message: `Downloading update ${info.version}...`,
      progress: 0,
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdater] ⭕ No updates available:', info.version);

  // No updates - show "Starting..." and launch app
  if (updateWindow && mainWindow) {
    updateWindow.webContents.send('update-status', {
      status: 'starting',
      message: 'Starting...',
      progress: 100,
    });

    // Close update window after 1 second
    setTimeout(() => {
      if (updateWindow && !updateWindow.isDestroyed()) {
        updateWindow.close();
      }
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 1000);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  const percent = Math.round(progressObj.percent);
  console.log(`[AutoUpdater] 📥 Download progress: ${percent}%`);

  if (updateWindow) {
    updateWindow.webContents.send('update-status', {
      status: 'downloading',
      message: `Downloading update... ${percent}%`,
      progress: percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  }
});

autoUpdater.on('update-downloaded', () => {
  console.log('[AutoUpdater] ✅ Update downloaded, installing...');

  if (updateWindow) {
    updateWindow.webContents.send('update-status', {
      status: 'installing',
      message: 'Installing update... Please wait',
      progress: 100,
    });

    // Close update window
    setTimeout(() => {
      if (updateWindow && !updateWindow.isDestroyed()) {
        updateWindow.close();
      }
    }, 500);
  }

  // Restart app after installation
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 1000);
});

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater] ❌ Update error:', err);

  // On error, still launch the app
  if (updateWindow && mainWindow) {
    updateWindow.webContents.send('update-status', {
      status: 'error',
      message: `Update error: ${err.message}`,
      progress: 0,
    });

    setTimeout(() => {
      if (updateWindow && !updateWindow.isDestroyed()) {
        updateWindow.close();
      }
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 2000);
  }
});

// IPC Handlers for manual update control
ipcMain.on('start-download', () => {
  console.log('[IPC] Start download requested');
  autoUpdater.downloadUpdate();
});

ipcMain.on('restart-app', () => {
  console.log('[IPC] Restart app requested');
  autoUpdater.quitAndInstall();
});

ipcMain.on('skip-update', () => {
  console.log('[IPC] Skip update requested');
  // Close update window and launch app
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.close();
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// App lifecycle
console.log('[Electron] === App Starting ===');
console.log('[Electron] Node version:', process.version);
console.log('[Electron] Electron version:', process.versions.electron);
console.log('[Electron] Chrome version:', process.versions.chrome);

app.whenReady().then(() => {
  console.log('[Electron] === App Ready ===');
  registerProtocol();
  handleDeepLinkFromArgv();
  createWindow();

  // Check for updates after window is created
  setTimeout(() => {
    checkForUpdates();
  }, 500);

  app.on('activate', () => {
    console.log('[Electron] Activate event');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Windows: Handle second instance with deep link
app.on('second-instance', handleSecondInstance);

// macOS: Handle open-url event
app.on('open-url', handleOpenUrl);

app.on('window-all-closed', () => {
  console.log('[Electron] === All Windows Closed ===');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  console.log('[Electron] === App Quit ===');
});

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Electron] Unhandled Rejection at:', promise, 'reason:', reason);
  dialog.showErrorBox('Unhandled Error', `Reason: ${reason}`);
});

console.log('[Electron] Waiting for app ready...');
