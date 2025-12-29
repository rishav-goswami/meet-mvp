import { Room } from './Room';
import { MediasoupService } from '../../services/mediasoup.service';
import { RedisService } from '../../services/redis.service'; // <--- Import
import { config } from '../../config/config';

export class RoomManager {
    private rooms: Map<string, Room> = new Map();

    // UPDATE: Inject RedisService
    constructor(
        private mediasoupService: MediasoupService,
        private redisService: RedisService
    ) { }

    public async getOrCreateRoom(roomId: string): Promise<Room> {
        // 1. Check local memory first (Fastest)
        let room = this.rooms.get(roomId);
        if (room) {
            return room;
        }

        // 2. Check Redis Directory (Scaling Step)
        // If it exists in Redis but not memory, it means we are "joining" an active room context.
        // In a multi-server setup, this is where we'd route to the correct server.
        // For this MVP, we acknowledge it and recreate the local router.
        const existsInRedis = await this.redisService.roomExists(roomId);
        if (existsInRedis) {
            console.log(`📚 Room ${roomId} found in Redis directory`);
        } else {
            console.log(`🏠 Creating new room: ${roomId}`);
        }

        // 3. Create the Mediasoup Router
        const worker = this.mediasoupService.getWorker();
        const router = await worker.createRouter({
            mediaCodecs: config.mediasoup.router.mediaCodecs
        });

        // 4. Create Room Instance
        room = new Room(roomId, router);
        this.rooms.set(roomId, room);

        // 5. Sync to Redis Directory
        await this.redisService.addRoom(roomId);

        return room;
    }

    public getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    // Helper to cleanup when everyone leaves
    public async closeRoom(roomId: string) {
        if (this.rooms.has(roomId)) {
            this.rooms.get(roomId)?.router.close();
            this.rooms.delete(roomId);
            await this.redisService.removeRoom(roomId);
            console.log(`🗑️ Room ${roomId} closed and removed from Redis`);
        }
    }
}