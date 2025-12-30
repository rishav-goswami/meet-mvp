import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  async login(username: string): Promise<{ userId: string; username: string; token: string }> {
    // For MVP, we'll generate a simple token on the client side
    // In production, this should call an API endpoint
    const userId = uuidv4();
    
    // Create a simple JWT-like token (in production, server should generate this)
    const token = btoa(JSON.stringify({
      userId,
      username,
      iat: Date.now(),
    }));

    return { userId, username, token };
  }

  async register(username: string): Promise<{ userId: string; username: string; token: string }> {
    // Similar to login for MVP
    return this.login(username);
  }
}

