import { Server, Socket } from 'socket.io';
import { RoomManager } from '../room/RoomManager';
import { authenticateSocket, AuthenticatedSocket } from '../auth/auth.middleware';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../../services/redis.service';

export class SocketHandler {
  private authService: AuthService;
  private redisService: RedisService;

  constructor(private io: Server, private roomManager: RoomManager) {
    this.authService = AuthService.getInstance();
    this.redisService = RedisService.getInstance();
  }

  public async handleConnection(socket: Socket) {
    // Authenticate socket connection
    const authenticatedSocket = await authenticateSocket(socket);
    if (!authenticatedSocket) {
      console.warn(`🛑 Unauthorized connection attempt from ${socket.handshake.address}`);
      socket.disconnect(true);
      return;
    }

    const userId = authenticatedSocket.userId;
    const username = authenticatedSocket.username || `User ${userId?.slice(0, 8)}`;

    console.log(`🔌 Client connected: ${socket.id} (User: ${username}, ID: ${userId})`);

    // Store authenticated socket reference
    (socket as any).authenticatedSocket = authenticatedSocket;

    // 1. Join Room
    socket.on('joinRoom', async ({ roomId, username: providedUsername }, callback) => {
      try {
        const room = await this.roomManager.getOrCreateRoom(roomId);
        
        // Check if user is rejoining (has other active sockets in Redis)
        let isRejoin = false;
        if (userId) {
          const hasActiveSockets = await this.redisService.hasActiveSockets(roomId, userId);
          if (hasActiveSockets) {
            isRejoin = true;
            console.log(`🔄 User ${userId} is rejoining room ${roomId}`);
            // Get old sockets and clean them up
            const oldSockets = await this.redisService.getUserSockets(roomId, userId);
            for (const oldSocketId of oldSockets) {
              // Check if old socket still exists in room
              const oldPeer = room.getParticipantBySocket(oldSocketId);
              if (oldPeer) {
                console.log(`  🧹 Cleaning up old socket: ${oldSocketId}`);
                room.removePeer(oldSocketId);
                // Notify others that old socket is leaving
                this.io.to(roomId).emit('participantLeft', {
                  userId,
                  socketId: oldSocketId,
                });
              }
            }
          }
        }
        
        // Determine role (first user becomes host, or preserve role on rejoin)
        let role: 'host' | 'subhost' | 'participant' = 'participant';
        if (room.getAllParticipants().length === 0) {
          role = 'host';
        } else if (userId) {
          // Check if user was host/subhost before
          const existingParticipant = room.getParticipant(userId);
          if (existingParticipant) {
            role = existingParticipant.role;
          }
        }

        // Add peer with user info (this will handle cleanup of old socket if needed)
        const displayUsername = providedUsername || username;
        room.addPeer(socket.id, userId, displayUsername, role);
        socket.join(roomId);

        // Update Redis with socket tracking
        if (userId) {
          await this.redisService.addParticipant(roomId, userId, socket.id);
          if (role === 'host') {
            await this.redisService.setRoomHost(roomId, userId);
          }
          await this.redisService.setRoomInfo(roomId, room.getRoomInfo());
        }

        console.log(`👤 User ${displayUsername} (${userId}) ${isRejoin ? 'rejoined' : 'joined'} room: ${roomId} as ${role}`);

        // Get list of existing streams (exclude own userId to prevent seeing own old streams)
        const peers = room.getActiveProducers(socket.id, userId);
        const participants = room.getAllParticipants();

        // Notify others about new participant (only if not a rejoin, or if it's a visible rejoin)
        if (!isRejoin) {
          socket.to(roomId).emit('participantJoined', {
            userId,
            username: displayUsername,
            role,
            socketId: socket.id,
          });
        } else {
          // On rejoin, notify others that user is back with new socket
          socket.to(roomId).emit('participantRejoined', {
            userId,
            username: displayUsername,
            role,
            socketId: socket.id,
          });
        }

        callback({
          rtpCapabilities: room.router?.rtpCapabilities,
          peers,
          roomInfo: room.getRoomInfo(),
          participants: participants.map(p => ({
            userId: p.userId,
            username: p.username,
            role: p.role,
            isMuted: p.isMuted,
            isVideoEnabled: p.isVideoEnabled,
          })),
          userRole: role,
          userId,
        });
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
    socket.on('transport-produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        if (!room) throw new Error('Room not found');

        const isScreenShare = appData?.source === 'screen';
        console.log(`🎥 User ${socket.id} producing ${kind}${isScreenShare ? ' (SCREEN SHARE)' : ''}`);
        
        const producer = await room.produce(socket.id, transportId, kind, rtpParameters);

        if (!producer) throw new Error('Producer creation failed');

        // Tell everyone else: "New User is sending video/audio!"
        socket.to(roomId).emit('newProducer', {
          producerId: producer.id,
          socketId: socket.id,
          kind: kind,
          appData: appData || {}
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

    // 7. Resume Consumer - FIXED: Actually resume the stream!
    socket.on('consumer-resume', async ({ consumerId }) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        if (!room) return;

        console.log(`▶️ Resuming consumer ${consumerId}`);
        await room.resumeConsumer(socket.id, consumerId);
      } catch (error) {
        console.error('❌ Resume Error:', error);
      }
    });

    // 8. Host Controls - Mute Participant
    socket.on('host:muteParticipant', async ({ targetUserId, mute }, callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        const currentUserId = this.getUserId(socket);
        if (!room || !currentUserId) {
          callback({ error: 'Room not found or user not authenticated' });
          return;
        }

        // Check permissions
        if (!room.canPerformHostAction(currentUserId)) {
          callback({ error: 'Insufficient permissions' });
          return;
        }

        const success = room.muteParticipant(targetUserId, mute);
        if (success) {
          // Notify the target user
          const targetParticipant = room.getParticipant(targetUserId);
          if (targetParticipant) {
            this.io.to(targetParticipant.socketId).emit('participantMuted', { muted: mute });
          }

          // Notify all participants
          this.io.to(roomId).emit('participantUpdated', {
            userId: targetUserId,
            isMuted: mute,
          });

          callback({ success: true });
        } else {
          callback({ error: 'Failed to mute participant' });
        }
      } catch (error) {
        console.error('❌ Mute Participant Error:', error);
        callback({ error: 'Failed to mute participant' });
      }
    });

    // 9. Host Controls - Remove Participant
    socket.on('host:removeParticipant', async ({ targetUserId }, callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        const currentUserId = this.getUserId(socket);
        if (!room || !currentUserId) {
          callback({ error: 'Room not found or user not authenticated' });
          return;
        }

        // Only host can remove participants
        if (!room.isHost(currentUserId)) {
          callback({ error: 'Only host can remove participants' });
          return;
        }

        const targetParticipant = room.getParticipant(targetUserId);
        if (!targetParticipant) {
          callback({ error: 'Participant not found' });
          return;
        }

        // Cannot remove host
        if (room.isHost(targetUserId)) {
          callback({ error: 'Cannot remove host' });
          return;
        }

        // Remove peer
        room.removePeer(targetParticipant.socketId);
        await this.redisService.removeParticipant(roomId, targetUserId);

        // Notify target to leave
        this.io.to(targetParticipant.socketId).emit('removedFromRoom');

        // Notify all participants
        this.io.to(roomId).emit('participantLeft', { userId: targetUserId });

        callback({ success: true });
      } catch (error) {
        console.error('❌ Remove Participant Error:', error);
        callback({ error: 'Failed to remove participant' });
      }
    });

    // 10. Host Controls - Assign Sub-host
    socket.on('host:assignSubHost', async ({ targetUserId }, callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        const currentUserId = this.getUserId(socket);
        if (!room || !currentUserId) {
          callback({ error: 'Room not found or user not authenticated' });
          return;
        }

        if (!room.isHost(currentUserId)) {
          callback({ error: 'Only host can assign sub-hosts' });
          return;
        }

        const success = room.updateParticipantRole(targetUserId, 'subhost');
        if (success) {
          await this.redisService.addSubHost(roomId, targetUserId);
          await this.redisService.setRoomInfo(roomId, room.getRoomInfo());

          // Notify all participants
          this.io.to(roomId).emit('participantRoleChanged', {
            userId: targetUserId,
            role: 'subhost',
          });

          callback({ success: true });
        } else {
          callback({ error: 'Failed to assign sub-host' });
        }
      } catch (error) {
        console.error('❌ Assign Sub-host Error:', error);
        callback({ error: 'Failed to assign sub-host' });
      }
    });

    // 11. Chat - Send Message
    socket.on('chat:sendMessage', async ({ message }, callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        const currentUserId = this.getUserId(socket);
        const currentUsername = this.getUsername(socket) || 'Unknown';
        if (!room || !currentUserId) {
          callback({ error: 'Not authenticated' });
          return;
        }

        if (!room.settings.allowChat) {
          callback({ error: 'Chat is disabled in this room' });
          return;
        }

        const chatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUserId,
          username: currentUsername,
          message: message.trim(),
          timestamp: Date.now(),
          type: 'text' as const,
          roomId,
        };

        // Store in Redis (keep last 100 messages)
        await this.redisService.client.lPush(`room:${roomId}:messages`, JSON.stringify(chatMessage));
        await this.redisService.client.lTrim(`room:${roomId}:messages`, 0, 99);

        // Broadcast to all participants
        this.io.to(roomId).emit('chat:newMessage', chatMessage);

        callback({ success: true, messageId: chatMessage.id });
      } catch (error) {
        console.error('❌ Send Message Error:', error);
        callback({ error: 'Failed to send message' });
      }
    });

    // 12. Chat - Get Message History
    socket.on('chat:getHistory', async (callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const messages = await this.redisService.client.lRange(`room:${roomId}:messages`, 0, 99);
        const parsedMessages = messages.map(msg => JSON.parse(msg)).reverse();
        callback({ messages: parsedMessages });
      } catch (error) {
        console.error('❌ Get Chat History Error:', error);
        callback({ error: 'Failed to get chat history', messages: [] });
      }
    });

    // 13. Streaming - Start Stream
    socket.on('stream:start', async (callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        const currentUserId = this.getUserId(socket);
        if (!room || !currentUserId) {
          callback({ error: 'Room not found or user not authenticated' });
          return;
        }

        if (!room.isHost(currentUserId)) {
          callback({ error: 'Only host can start streaming' });
          return;
        }

        // Update stream info in Redis
        const streamInfo = {
          roomId,
          isLive: true,
          startedAt: Date.now(),
          viewerCount: 0,
          streamKey: `${roomId}-${Date.now()}`,
          hostId: currentUserId,
        };

        await this.redisService.client.set(`stream:${roomId}`, JSON.stringify(streamInfo));

        // Notify all participants
        this.io.to(roomId).emit('stream:started', streamInfo);

        callback({ success: true });
      } catch (error) {
        console.error('❌ Start Stream Error:', error);
        callback({ error: 'Failed to start stream' });
      }
    });

    // 14. Streaming - Stop Stream
    socket.on('stream:stop', async (callback) => {
      try {
        const roomId = this.getRoomId(socket);
        const room = this.roomManager.getRoom(roomId);
        const currentUserId = this.getUserId(socket);
        if (!room || !currentUserId) {
          callback({ error: 'Room not found or user not authenticated' });
          return;
        }

        if (!room.isHost(currentUserId)) {
          callback({ error: 'Only host can stop streaming' });
          return;
        }

        // Update stream info in Redis
        await this.redisService.client.del(`stream:${roomId}`);

        // Notify all participants
        this.io.to(roomId).emit('stream:stopped');

        callback({ success: true });
      } catch (error) {
        console.error('❌ Stop Stream Error:', error);
        callback({ error: 'Failed to stop stream' });
      }
    });

    // 15. Disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      const roomId = this.getRoomId(socket);
      const currentUserId = this.getUserId(socket);
      const currentUsername = this.getUsername(socket) || 'Unknown';
      
      if (roomId && currentUserId) {
        const room = this.roomManager.getRoom(roomId);
        if (room) {
          // Remove peer from room (closes all producers/consumers)
          room.removePeer(socket.id);
          
          // Remove socket from Redis tracking
          await this.redisService.removeParticipant(roomId, currentUserId, socket.id);
          
          // Check if user has any remaining active sockets
          const hasOtherSockets = await this.redisService.hasActiveSockets(roomId, currentUserId);
          
          if (!hasOtherSockets) {
            // User has no more active sockets, they've fully left
            console.log(`  👋 User ${currentUserId} has fully left room ${roomId}`);
            
            // Notify others with socketId for cleanup
            this.io.to(roomId).emit('participantLeft', { 
              userId: currentUserId,
              socketId: socket.id,
              fullyLeft: true
            });

            // Send system message
            if (room.settings.allowChat) {
              const systemMessage = {
                id: `${Date.now()}-system`,
                userId: 'system',
                username: 'System',
                message: `${currentUsername} left the room`,
                timestamp: Date.now(),
                type: 'system' as const,
                roomId,
              };
              this.io.to(roomId).emit('chat:newMessage', systemMessage);
            }
          } else {
            // User still has other sockets (multi-tab scenario), just notify about this socket
            console.log(`  🔄 User ${currentUserId} still has other active sockets`);
            this.io.to(roomId).emit('participantLeft', { 
              userId: currentUserId,
              socketId: socket.id,
              fullyLeft: false
            });
          }
        }
      }
    });
  }

  private getRoomId(socket: Socket): string {
    return Array.from(socket.rooms).find(r => r !== socket.id) || '';
  }

  private getUserId(socket: Socket): string | undefined {
    const authSocket = (socket as any).authenticatedSocket as AuthenticatedSocket | undefined;
    return authSocket?.userId;
  }

  private getUsername(socket: Socket): string | undefined {
    const authSocket = (socket as any).authenticatedSocket as AuthenticatedSocket | undefined;
    return authSocket?.username;
  }

}