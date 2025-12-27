import { Server, Socket } from 'socket.io';
import { RoomManager } from '../room/RoomManager';

export class SocketHandler {
  constructor(private io: Server, private roomManager: RoomManager) {}

  public handleConnection(socket: Socket) {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Middleware-like: Auth Check could go here
    // if (!socket.handshake.auth.token) socket.disconnect();

    socket.on('joinRoom', async ({ roomId }, callback) => {
      const room = await this.roomManager.getOrCreateRoom(roomId);
      room.addPeer(socket.id);
      socket.join(roomId);
      
      callback({ rtpCapabilities: room.router?.rtpCapabilities });
    });

    socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
      const roomId = this.getRoomId(socket);
      const room = this.roomManager.getRoom(roomId);
      if (!room) return;

      const transport = await room.createTransport(socket.id);
      
      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        }
      });
    });

    // ... (Add handleProduce, handleConsume, handleDisconnect similar to before)

    socket.on('disconnect', () => {
        const roomId = this.getRoomId(socket); // Logic to track which room socket was in
        if (roomId) {
            const room = this.roomManager.getRoom(roomId);
            room?.removePeer(socket.id);
        }
    });
  }

  private getRoomId(socket: Socket): string {
    // Helper to find the room the socket is in (excluding its own ID)
    return Array.from(socket.rooms).find(r => r !== socket.id) || '';
  }
}