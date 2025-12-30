export type UserRole = 'host' | 'subhost' | 'participant';

export interface User {
  userId: string;
  username: string;
  email?: string;
  role: UserRole;
  socketId: string;
  joinedAt: number;
  avatar?: string;
}

export interface UserCredentials {
  username: string;
  password?: string;
  email?: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  email?: string;
  iat?: number;
  exp?: number;
}

