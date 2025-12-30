import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AuthService } from '../services/auth.service';

interface AuthContextType {
  user: { userId: string; username: string; email?: string; token: string } | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string | undefined, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ userId: string; username: string; email?: string; token: string } | null>(() => {
    // Try to load from localStorage
    const stored = localStorage.getItem('auth_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = useCallback(async (username: string, password: string) => {
    const authService = new AuthService();
    const response = await authService.login(username, password);
    const userData = {
      userId: response.user.userId,
      username: response.user.username,
      email: response.user.email,
      token: response.token,
    };
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  }, []);

  const signup = useCallback(async (username: string, email: string | undefined, password: string) => {
    const authService = new AuthService();
    const response = await authService.signup(username, email, password);
    const userData = {
      userId: response.user.userId,
      username: response.user.username,
      email: response.user.email,
      token: response.token,
    };
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    if (user?.token) {
      const authService = new AuthService();
      await authService.logout(user.token);
    }
    setUser(null);
    localStorage.removeItem('auth_user');
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

