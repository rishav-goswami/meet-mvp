import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { User, UserCredentials, JWTPayload } from '../../types/user.types';
import { DatabaseService } from '../../services/database.service';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

interface DbUser {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

export class AuthService {
  private static instance: AuthService;
  private db: Database.Database;

  private constructor() {
    const dbService = DatabaseService.getInstance();
    this.db = dbService.getDb();
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
   * Register a new user
   */
  public async registerUser(credentials: UserCredentials): Promise<{ user: User; token: string }> {
    if (!credentials.password) {
      throw new Error('Password is required');
    }

    const userId = uuidv4();
    const hashedPassword = await this.hashPassword(credentials.password);
    const now = Date.now();

    try {
      // Insert user into database
      const stmt = this.db.prepare(`
        INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        credentials.username,
        credentials.email || null,
        hashedPassword,
        now,
        now
      );

      // Create user object
      const user: User = {
        userId,
        username: credentials.username,
        email: credentials.email,
        role: 'participant',
        socketId: '',
        joinedAt: now,
      };

      // Generate token
      const token = this.generateToken({
        userId,
        username: credentials.username,
        email: credentials.email,
      });

      // Store session
      await this.createSession(userId, token);

      return { user, token };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Username or email already exists');
      }
      throw error;
    }
  }

  /**
   * Login user
   */
  public async loginUser(username: string, password: string): Promise<{ user: User; token: string }> {
    // Get user from database
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ? OR email = ?');
    const dbUser = stmt.get(username, username) as DbUser | undefined;

    if (!dbUser) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await this.comparePassword(password, dbUser.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Create user object
    const user: User = {
      userId: dbUser.id,
      username: dbUser.username,
      email: dbUser.email || undefined,
      role: 'participant',
      socketId: '',
      joinedAt: dbUser.created_at,
    };

    // Generate token
    const token = this.generateToken({
      userId: user.userId,
      username: user.username,
      email: user.email,
    });

    // Store session (synchronous)
    this.createSession(user.userId, token);

    return { user, token };
  }

  /**
   * Get user by ID
   */
  public getUser(userId: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const dbUser = stmt.get(userId) as DbUser | undefined;

    if (!dbUser) return null;

    return {
      userId: dbUser.id,
      username: dbUser.username,
      email: dbUser.email || undefined,
      role: 'participant',
      socketId: '',
      joinedAt: dbUser.created_at,
    };
  }

  /**
   * Get user by username
   */
  public getUserByUsername(username: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    const dbUser = stmt.get(username) as DbUser | undefined;

    if (!dbUser) return null;

    return {
      userId: dbUser.id,
      username: dbUser.username,
      email: dbUser.email || undefined,
      role: 'participant',
      socketId: '',
      joinedAt: dbUser.created_at,
    };
  }

  /**
   * Update user socket ID
   */
  public updateUserSocket(userId: string, socketId: string): void {
    // For SQLite, we'll store socket ID in a separate table or use Redis for real-time data
    // For now, we'll just update the user's last activity
    const stmt = this.db.prepare('UPDATE users SET updated_at = ? WHERE id = ?');
    stmt.run(Date.now(), userId);
  }

  /**
   * Update user role
   */
  public async updateUserRole(userId: string, role: User['role']): Promise<void> {
    // Role is stored in Redis for room-specific roles
    // This method is kept for compatibility
  }

  /**
   * Create or get user (for legacy/guest users)
   */
  public async createOrGetUser(username: string, email?: string): Promise<User> {
    // Check if user exists
    let user = this.getUserByUsername(username);
    if (user) {
      return user;
    }

    // Create guest user (no password)
    const userId = uuidv4();
    const now = Date.now();
    const hashedPassword = await this.hashPassword(uuidv4()); // Random password for guest

    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(userId, username, email || null, hashedPassword, now, now);

    return {
      userId,
      username,
      email,
      role: 'participant',
      socketId: '',
      joinedAt: now,
    };
  }

  /**
   * Create session
   */
  private createSession(userId: string, token: string): void {
    const sessionId = uuidv4();
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(sessionId, userId, token, now, expiresAt);

    // Clean up expired sessions
    this.cleanupExpiredSessions();
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE expires_at < ?');
    stmt.run(Date.now());
  }

  /**
   * Verify session token
   */
  public verifySession(token: string): boolean {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?');
    const session = stmt.get(token, Date.now());
    return !!session;
  }

  /**
   * Logout (delete session)
   */
  public logout(token: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  }
}
