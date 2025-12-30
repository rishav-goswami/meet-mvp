import { Socket } from 'socket.io';
import { AuthService } from './auth.service';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  user?: any;
}

/**
 * Middleware to authenticate socket connections
 */
export async function authenticateSocket(socket: Socket): Promise<AuthenticatedSocket | null> {
  const authService = AuthService.getInstance();
  const token = socket.handshake.auth.token;

  if (!token) {
    return null;
  }

  // For backward compatibility, check if it's the old AUTH_SECRET
  if (token === process.env.AUTH_SECRET) {
    // Legacy auth - create a temporary user
    const user = await authService.createOrGetUser(`guest_${socket.id.slice(0, 8)}`);
    (socket as AuthenticatedSocket).userId = user.userId;
    (socket as AuthenticatedSocket).username = user.username;
    (socket as AuthenticatedSocket).user = user;
    return socket as AuthenticatedSocket;
  }

  // Verify JWT token
  const payload = authService.verifyToken(token);
  if (!payload) {
    return null;
  }

  // Get user from SQLite database
  const user = authService.getUser(payload.userId);
  if (!user) {
    return null;
  }

  // Verify session is still valid
  const isSessionValid = authService.verifySession(token);
  if (!isSessionValid) {
    return null;
  }

  // Update socket ID
  authService.updateUserSocket(payload.userId, socket.id);

  (socket as AuthenticatedSocket).userId = user.userId;
  (socket as AuthenticatedSocket).username = user.username;
  (socket as AuthenticatedSocket).user = user;

  return socket as AuthenticatedSocket;
}

