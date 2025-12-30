import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, UserCredentials, JWTPayload } from '../../types/user.types';
import { RedisService } from '../../services/redis.service';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export class AuthService {
  private static instance: AuthService;
  private redisService: RedisService;

  private constructor() {
    this.redisService = RedisService.getInstance();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Generate JWT token for user
   */
  public generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verify and decode JWT token
   */
  public verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Hash password
   */
  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compare password with hash
   */
  public async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register a new user (for future use)
   */
  public async registerUser(credentials: UserCredentials): Promise<User> {
    const userId = uuidv4();
    const hashedPassword = credentials.password 
      ? await this.hashPassword(credentials.password)
      : null;

    const user: User = {
      userId,
      username: credentials.username,
      email: credentials.email,
      role: 'participant',
      socketId: '',
      joinedAt: Date.now(),
    };

    // Store user in Redis
    await this.redisService.client.set(
      `user:${userId}`,
      JSON.stringify({ ...user, passwordHash: hashedPassword })
    );

    return user;
  }

  /**
   * Create or get user (simplified for MVP - no password required)
   */
  public async createOrGetUser(username: string, email?: string): Promise<User> {
    // For MVP, we'll create users on-the-fly
    // In production, you'd check if user exists first
    const userId = uuidv4();
    
    const user: User = {
      userId,
      username,
      email,
      role: 'participant',
      socketId: '',
      joinedAt: Date.now(),
    };

    // Store user in Redis
    await this.redisService.client.set(
      `user:${userId}`,
      JSON.stringify(user)
    );

    return user;
  }

  /**
   * Get user by ID
   */
  public async getUser(userId: string): Promise<User | null> {
    const userData = await this.redisService.client.get(`user:${userId}`);
    if (!userData) return null;

    const user = JSON.parse(userData);
    // Remove password hash if present
    delete user.passwordHash;
    return user as User;
  }

  /**
   * Update user socket ID
   */
  public async updateUserSocket(userId: string, socketId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    user.socketId = socketId;
    await this.redisService.client.set(
      `user:${userId}`,
      JSON.stringify(user)
    );
  }

  /**
   * Update user role
   */
  public async updateUserRole(userId: string, role: User['role']): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    user.role = role;
    await this.redisService.client.set(
      `user:${userId}`,
      JSON.stringify(user)
    );
  }
}

