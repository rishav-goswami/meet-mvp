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

    // Store room info with TTL
    public async setRoomInfo(roomId: string, roomInfo: any) {
        await this.client.set(`room:${roomId}:info`, JSON.stringify(roomInfo));
        await this.client.expire(`room:${roomId}:info`, 3600); // 1 hour TTL
    }

    // Get room info
    public async getRoomInfo(roomId: string): Promise<any | null> {
        const data = await this.client.get(`room:${roomId}:info`);
        return data ? JSON.parse(data) : null;
    }

    // Clean up all room data (used when room is empty)
    public async cleanupRoom(roomId: string) {
        const participants = await this.getParticipants(roomId);
        // Clean up all user socket tracking
        for (const userId of participants) {
            await this.client.del(`room:${roomId}:user:${userId}:sockets`);
        }
        // Clean up room data
        await this.removeRoom(roomId);
    }

    // Add participant to room with socket tracking and TTL
    public async addParticipant(roomId: string, userId: string, socketId: string) {
        // Add to participants set
        await this.client.sAdd(`room:${roomId}:participants`, userId);
        // Track socket for this user (supports multiple sockets per user)
        await this.client.sAdd(`room:${roomId}:user:${userId}:sockets`, socketId);
        // Set TTL on socket tracking (1 hour)
        await this.client.expire(`room:${roomId}:user:${userId}:sockets`, 3600);
        // Set participant entry with TTL (1 hour)
        await this.client.expire(`room:${roomId}:participants`, 3600);
    }

    // Remove participant from room
    public async removeParticipant(roomId: string, userId: string, socketId?: string) {
        if (socketId) {
            // Remove specific socket
            await this.client.sRem(`room:${roomId}:user:${userId}:sockets`, socketId);
            // Check if user has any other active sockets
            const remainingSockets = await this.client.sMembers(`room:${roomId}:user:${userId}:sockets`);
            if (remainingSockets.length === 0) {
                // No more sockets for this user, remove from participants
                await this.client.sRem(`room:${roomId}:participants`, userId);
                await this.client.del(`room:${roomId}:user:${userId}:sockets`);
            }
        } else {
            // Remove all sockets for this user
            await this.client.sRem(`room:${roomId}:participants`, userId);
            await this.client.del(`room:${roomId}:user:${userId}:sockets`);
        }
    }

    // Get all participants in room
    public async getParticipants(roomId: string): Promise<string[]> {
        return await this.client.sMembers(`room:${roomId}:participants`);
    }

    // Get all sockets for a user in a room
    public async getUserSockets(roomId: string, userId: string): Promise<string[]> {
        return await this.client.sMembers(`room:${roomId}:user:${userId}:sockets`);
    }

    // Check if user has active sockets in room
    public async hasActiveSockets(roomId: string, userId: string): Promise<boolean> {
        const sockets = await this.getUserSockets(roomId, userId);
        return sockets.length > 0;
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