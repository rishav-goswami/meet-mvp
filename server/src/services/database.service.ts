import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;

  private constructor() {
    const dbDir = join(process.cwd(), 'data');
    const dbPath = process.env.DB_PATH || join(dbDir, 'meet.db');
    
    // Create directory if it doesn't exist
    try {
      mkdirSync(dbDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeTables() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Sessions table (for tracking active sessions)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    `);

    console.log('✅ Database initialized');
  }

  public getDb(): Database.Database {
    return this.db;
  }

  public close() {
    this.db.close();
  }
}

