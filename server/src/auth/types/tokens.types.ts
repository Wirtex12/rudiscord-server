export interface JwtPayload {
  sub: string;
  username: string;
  userUniqueId?: string;  // 8-значный уникальный ID пользователя
}

export interface User {
  id: string;
  userId?: string;
  username: string;
  email: string;
  avatar?: string | null;
  createdAt?: Date;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends Tokens {
  user: User;
}
