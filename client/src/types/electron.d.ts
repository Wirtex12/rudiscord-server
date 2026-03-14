export {};

declare global {
  interface Window {
    electron?: {
      platform: string;
      send: (channel: string, data: unknown) => void;
      receive: (channel: string, func: (...args: unknown[]) => void) => void;
      removeListener: (channel: string, func: (...args: unknown[]) => void) => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
    };
    autoUpdate?: {
      checkForUpdates: () => void;
      startDownload: () => void;
      restartApp: () => void;
      skipUpdate: () => void;
      onUpdateStatus: (callback: (data: any) => void) => void;
    };
  }
}
