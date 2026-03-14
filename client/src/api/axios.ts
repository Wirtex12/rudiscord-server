import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_URL, API_TIMEOUT } from '../config';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен авторизации в каждый запрос
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Обработка ответов и ошибок
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Токен истёк или невалиден
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Перенаправляем на вход (если не на странице входа)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Логируем ошибки (для отладки)
    console.error('API Error:', {
      status: error.response?.status,
      message: error.response?.data,
      url: (error.config as InternalAxiosRequestConfig)?.url,
    });
    
    return Promise.reject(error);
  }
);

export default api;
