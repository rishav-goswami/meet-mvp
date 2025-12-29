import { Room } from './Room';
import { MediasoupService } from '../../services/mediasoup.service';
import { config } from '../../config/config';

export class RoomManager {
    private rooms: Map<string, Room> = new Map(); // currently using in-memory storage but will switch to Redis later

    constructor(private mediasoupService: MediasoupService) { }

    public async getOrCreateRoom(roomId: string): Promise<Room> {
        // 1. Check if room exists
        let room = this.rooms.get(roomId);
        if (room) {
            return room;
        }

        console.log(`🏠 Creating new room: ${roomId}`);

        // 2. Get a Worker from the Service (FIXED METHOD NAME)
        const worker = this.mediasoupService.getWorker();

        // 3. Create the Mediasoup Router explicitly
        const router = await worker.createRouter({
            mediaCodecs: config.mediasoup.router.mediaCodecs
        });

        // 4. Create the Room instance
        room = new Room(roomId, router);

        // 5. Save and return
        this.rooms.set(roomId, room);
        return room;
    }

    public getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }
}