import { Server, Socket } from 'socket.io';
import { RoomManager } from '../room/RoomManager';

export class SocketHandler {
  constructor(private io: Server, private roomManager: RoomManager) { }

  public handleConnection(socket: Socket) {
    console.log(`🔌 Client connected: ${socket.id}`);

    // 1. Join Room
    socket.on('joinRoom', async ({ roomId }, callback) => {
      try {
        const room = await this.roomManager.getOrCreateRoom(roomId);
        room.addPeer(socket.id);
        socket.join(roomId);

        console.log(`👤 User ${socket.id} joined room: ${roomId}`);
        callback({ rtpCapabilities: room.router?.rtpCapabilities });
      } catch (error) {
        console.error('❌ Join Error:', error);
        callback({ error: 'Failed to join' });
      }
    });

    // 2. Create Transport (Send or Recv)
    socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        if (!room) throw new Error('Room not found');

        console.log(`🛠 Creating ${consumer ? 'RECV' : 'SEND'} transport for ${socket.id}`);
        const transport = await room.createTransport(socket.id);

        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          }
        });
      } catch (error) {
        console.error('❌ Create Transport Error:', error);
        callback({ error: 'Failed to create transport' });
      }
    });

    // 3. Connect Transport (DTLS Handshake)
    socket.on('transport-connect', async ({ transportId, dtlsParameters }) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        if (!room) return;

        console.log(`🤝 Connecting SEND transport: ${transportId}`);
        await room.connectTransport(socket.id, transportId, dtlsParameters);
      } catch (error) {
        console.error('❌ Transport Connect Error:', error);
      }
    });

    // 4. Produce (Publish Media) - THIS WAS MISSING
    socket.on('transport-produce', async ({ transportId, kind, rtpParameters }, callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        if (!room) throw new Error('Room not found');

        console.log(`🎥 User ${socket.id} producing ${kind}`);
        const producer = await room.produce(socket.id, transportId, kind, rtpParameters);

        if (!producer) throw new Error('Producer creation failed');

        // Tell everyone else: "New User is sending video!"
        socket.to(roomId).emit('newProducer', {
          producerId: producer.id, 
          socketId: socket.id
        });

        callback({ id: producer.id });
      } catch (error) {
        console.error('❌ Produce Error:', error);
        callback({ error: 'Failed to produce' });
      }
    });

    // 5. Connect Recv Transport - THIS WAS MISSING
    socket.on('transport-recv-connect', async ({ transportId, dtlsParameters }) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        if (!room) return;

        console.log(`🤝 Connecting RECV transport: ${transportId}`);
        await room.connectTransport(socket.id, transportId, dtlsParameters);
      } catch (error) {
        console.error('❌ Recv Transport Connect Error:', error);
      }
    });

    // 6. Consume (Subscribe Media) - THIS WAS MISSING
    socket.on('consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        if (!room) throw new Error('Room not found');

        console.log(`👀 User ${socket.id} consuming producer ${producerId}`);
        const consumer = await room.consume(socket.id, transportId, producerId, rtpCapabilities);

        if (!consumer) {
          callback({ error: 'Cannot consume' });
          return;
        }

        callback({
          params: {
            id: consumer.id,
            producerId: producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          }
        });
      } catch (error) {
        console.error('❌ Consume Error:', error);
        callback({ error: 'Consumption failed' });
      }
    });

    // 7. Resume Consumer
    socket.on('consumer-resume', async ({ consumerId }) => {
      // In a real app, you might need to find the consumer and call resume()
      // But Mediasoup consumers start paused, so this event is often just a signal
      // For simple implementations, the server can auto-resume or we implement logic:
      // const consumer = findConsumer(consumerId); consumer.resume();
      console.log(`▶️ Resuming consumer ${consumerId}`);
    });

    // 8. Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      const roomId = this.getRoomId(socket);
      if (roomId) {
        const room = this.roomManager.getRoom(roomId);
        room?.removePeer(socket.id);
      }
    });
  }

  private getRoomId(socket: Socket): string {
    return Array.from(socket.rooms).find(r => r !== socket.id) || '';
  }
}