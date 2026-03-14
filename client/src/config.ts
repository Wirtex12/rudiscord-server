// API и Socket URLs
export const API_URL = 'https://voxit-backend.onrender.com';
export const SOCKET_URL = 'https://voxit-backend.onrender.com';

// Таймауты (мс)
export const API_TIMEOUT = 5000;  // 5 секунд (на случай "пробуждения" Render)
export const SOCKET_RECONNECT_DELAY = 1000;
export const SOCKET_RECONNECT_ATTEMPTS = 5;

// Пути
export const UPLOAD_PATH = '/auth/upload-avatar';
export const AVATAR_URL = `${API_URL}/uploads/avatars`;

// Функции для работы с API_URL
export const setApiUrl = (url: string) => {
  localStorage.setItem('api_url', url);
};

export const getApiUrl = () => {
  return localStorage.getItem('api_url') || API_URL;
};

export const setSocketUrl = (url: string) => {
  localStorage.setItem('socket_url', url);
};

export const getSocketUrl = () => {
  return localStorage.getItem('socket_url') || SOCKET_URL;
};

// Логирование
export const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'info'; // 'debug' | 'info' | 'warn' | 'error'

// Helper для логирования
export const log = {
  debug: (...args: any[]) => LOG_LEVEL === 'debug' && console.log('[DEBUG]', ...args),
  info: (...args: any[]) => ['info', 'debug'].includes(LOG_LEVEL) && console.log('[INFO]', ...args),
  warn: (...args: any[]) => ['warn', 'info', 'debug'].includes(LOG_LEVEL) && console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};
