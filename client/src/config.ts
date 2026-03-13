// ✅ API URL (будет обновлён после деплоя на Render)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ✅ Socket.io URL
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// ✅ Функция для обновления URL после деплоя
export const setApiUrl = (url: string) => {
  localStorage.setItem('api_url', url);
};

export const getApiUrl = () => {
  return localStorage.getItem('api_url') || API_URL;
};

export const getSocketUrl = () => {
  return localStorage.getItem('socket_url') || SOCKET_URL;
};

export const setSocketUrl = (url: string) => {
  localStorage.setItem('socket_url', url);
};
