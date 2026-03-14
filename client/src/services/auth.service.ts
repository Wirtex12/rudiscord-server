import api from '../api/axios';

export interface User {
  id: string;
  userId?: string;
  shortId?: string;  // 6-значный код для добавления в друзья
  username: string;
  email: string;
  avatar?: string | null;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

class AuthService {
  // Регистрация
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    if (response.data.accessToken) {
      localStorage.setItem('auth_token', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  }

  // Вход
  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    
    if (response.data.accessToken) {
      localStorage.setItem('auth_token', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  }

  // Выход
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  // Проверка токена
  async verifyToken(): Promise<User> {
    const response = await api.post<User>('/auth/verify-token');
    return response.data;
  }

  // Получение текущего пользователя
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  // Получение токена
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Проверка авторизации
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Загрузка аватара
  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post<User>('/auth/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }

    return response.data;
  }

  // Удаление аватара
  async removeAvatar(): Promise<User> {
    const response = await api.post<User>('/auth/remove-avatar');
    
    if (response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response.data;
  }

  // Удаление аккаунта
  async deleteAccount(): Promise<void> {
    await api.delete('/auth/account');
    this.logout();
  }
}

export default new AuthService();
