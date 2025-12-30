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
        await this.client.del(`room:${roomId}:participants`);
        await this.client.del(`room:${roomId}:messages`);
        await this.client.del(`room:${roomId}:host`);
        await this.client.del(`room:${roomId}:subhosts`);
    }

    // Store room info
    public async setRoomInfo(roomId: string, roomInfo: any) {
        await this.client.set(`room:${roomId}:info`, JSON.stringify(roomInfo));
    }

    // Get room info
    public async getRoomInfo(roomId: string): Promise<any | null> {
        const data = await this.client.get(`room:${roomId}:info`);
        return data ? JSON.parse(data) : null;
    }

    // Add participant to room
    public async addParticipant(roomId: string, userId: string) {
        await this.client.sAdd(`room:${roomId}:participants`, userId);
    }

    // Remove participant from room
    public async removeParticipant(roomId: string, userId: string) {
        await this.client.sRem(`room:${roomId}:participants`, userId);
    }

    // Get all participants in room
    public async getParticipants(roomId: string): Promise<string[]> {
        return await this.client.sMembers(`room:${roomId}:participants`);
    }

    // Set room host
    public async setRoomHost(roomId: string, userId: string) {
        await this.client.set(`room:${roomId}:host`, userId);
    }

    // Get room host
    public async getRoomHost(roomId: string): Promise<string | null> {
        return await this.client.get(`room:${roomId}:host`);
    }

    // Add sub-host
    public async addSubHost(roomId: string, userId: string) {
        await this.client.sAdd(`room:${roomId}:subhosts`, userId);
    }

    // Remove sub-host
    public async removeSubHost(roomId: string, userId: string) {
        await this.client.sRem(`room:${roomId}:subhosts`, userId);
    }

    // Get all sub-hosts
    public async getSubHosts(roomId: string): Promise<string[]> {
        return await this.client.sMembers(`room:${roomId}:subhosts`);
    }
}