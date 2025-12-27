import { Room } from './Room';
import { MediasoupService } from '../../services/mediasoup.service';

export class RoomManager {
    private rooms: Map<string, Room> = new Map();

    constructor(private mediasoupService: MediasoupService) { }

    async getOrCreateRoom(roomId: string): Promise<Room> {
        let room = this.rooms.get(roomId);
        if (!room) {
            room = new Room(roomId);
            const worker = this.mediasoupService.getWorker();
            await room.init(worker);
            this.rooms.set(roomId, room);
        }
        return room;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }
}