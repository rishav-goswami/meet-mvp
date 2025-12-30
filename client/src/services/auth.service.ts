const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, connect directly to backend
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  // In production, use the same origin (nginx will proxy to backend)
  return window.location.origin;
};

const API_URL = getApiUrl();

export interface AuthResponse {
  success: boolean;
  user: {
    userId: string;
    username: string;
    email?: string;
  };
  token: string;
}

export class AuthService {
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  }

  async signup(username: string, email: string | undefined, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    return response.json();
  }

  async logout(token: string): Promise<void> {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(token: string): Promise<AuthResponse['user'] | null> {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }
}

