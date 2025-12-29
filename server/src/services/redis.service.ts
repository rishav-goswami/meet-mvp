import { createClient } from 'redis';
import { config } from '../config/config';

export class RedisService {
    private static instance: RedisService;
    public client;

    private constructor() {
        this.client = createClient({
            socket: { host: config.redis.host, port: config.redis.port }
        });
        this.client.on('error', (err) => console.error('Redis Client Error', err));
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    public async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
            console.log('✅ Redis connected');
        }
    }

    // --- METHODS FOR ROOM DIRECTORY ---

    // Mark a room as active in Redis
    public async addRoom(roomId: string) {
        await this.client.set(`room:${roomId}`, 'active');
        // Optional: Set expiry (e.g., 24 hours) to prevent stale keys
        await this.client.expire(`room:${roomId}`, 86400);
    }

    // Check if a room exists in the global directory
    public async roomExists(roomId: string): Promise<boolean> {
        const exists = await this.client.exists(`room:${roomId}`);
        return exists === 1;
    }

    // Remove room from directory
    public async removeRoom(roomId: string) {
        await this.client.del(`room:${roomId}`);
    }
}