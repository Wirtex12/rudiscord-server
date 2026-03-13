import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  send: (channel: string, data: unknown) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: unknown[]) => void) => {
    const validChannels = ['fromMain', 'deep-link'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => func(...args));
    }
  },
  removeListener: (channel: string, func: (...args: unknown[]) => void) => {
    const validChannels = ['fromMain', 'deep-link'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, func);
    }
  },
});

// Auto-update API for renderer process
contextBridge.exposeInMainWorld('autoUpdate', {
  checkForUpdates: () => {
    ipcRenderer.send('check-for-updates');
  },
  startDownload: () => {
    ipcRenderer.send('start-download');
  },
  restartApp: () => {
    ipcRenderer.send('restart-app');
  },
  skipUpdate: () => {
    ipcRenderer.send('skip-update');
  },
  onUpdateStatus: (callback: (data: any) => void) => {
    ipcRenderer.on('update-status', (_event, data) => callback(data));
  },
});
