export interface JwtPayload {
  sub: string;
  username: string;
  userUniqueId?: string;  // 8-значный уникальный ID пользователя
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
