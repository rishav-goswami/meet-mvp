import { Router, WebRtcTransport, Producer, Consumer } from 'mediasoup/types';
import { config } from '../../config/config';
import { ParticipantInfo, RoomInfo, RoomSettings } from '../../types/room.types';
import { UserRole } from '../../types/user.types';

interface Peer {
    id: string; // socketId
    userId?: string; // userId (for user management)
    transports: Map<string, WebRtcTransport>; // transportId -> Transport
    producers: Map<string, Producer>;         // producerId -> Producer
    consumers: Map<string, Consumer>;         // consumerId -> Consumer
}

export class Room {
    public id: string;
    public router: Router;
    public hostId: string | null = null;
    public subHostIds: Set<string> = new Set();
    private peers: Map<string, Peer> = new Map(); // socketId -> Peer
    private participants: Map<string, ParticipantInfo> = new Map(); // userId -> ParticipantInfo
    private socketToUserId: Map<string, string> = new Map(); // socketId -> userId
    public settings: RoomSettings = {
        maxParticipants: 50,
        allowScreenShare: true,
        allowChat: true,
        recordingEnabled: false,
    };
    public createdAt: number = Date.now();

    constructor(roomId: string, router: Router) {
        this.id = roomId;
        this.router = router;
    }

    // Add a user to the room (handles rejoin scenarios)
    public addPeer(socketId: string, userId?: string, username?: string, role?: UserRole) {
        let existingParticipant: ParticipantInfo | undefined;

        // If user already has a different socket in this room, remove the old one (rejoin scenario)
        if (userId) {
            existingParticipant = this.participants.get(userId);
            if (existingParticipant && existingParticipant.socketId !== socketId) {
                console.log(`🔄 User ${userId} rejoining with new socket. Cleaning up old socket: ${existingParticipant.socketId}`);
                // Remove old peer
                this.removePeer(existingParticipant.socketId);
                // Re-fetch after removal (in case it was cleared)
                existingParticipant = this.participants.get(userId);
            }
        }

        // Check if socketId already exists (shouldn't happen, but safety check)
        if (this.peers.has(socketId)) {
            console.warn(`⚠️ Socket ${socketId} already exists in room. Removing old entry.`);
            this.removePeer(socketId);
        }

        const peer: Peer = {
            id: socketId,
            userId,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
        };
        this.peers.set(socketId, peer);

        if (userId) {
            this.socketToUserId.set(socketId, userId);
            
            // If this is the first user, make them host
            if (this.participants.size === 0 && !this.hostId) {
                this.hostId = userId;
                role = 'host';
            }

            const participant: ParticipantInfo = {
                userId,
                username: username || existingParticipant?.username || `User ${userId.slice(0, 8)}`,
                role: role || existingParticipant?.role || 'participant', // Preserve role on rejoin if exists
                socketId,
                joinedAt: existingParticipant?.joinedAt || Date.now(), // Preserve original join time
                isMuted: false,
                isVideoEnabled: true,
            };

            this.participants.set(userId, participant);

            // Track sub-hosts
            if (role === 'subhost') {
                this.subHostIds.add(userId);
            }
        }
    }

    // Get participant by userId
    public getParticipant(userId: string): ParticipantInfo | undefined {
        return this.participants.get(userId);
    }

    // Get participant by socketId
    public getParticipantBySocket(socketId: string): ParticipantInfo | undefined {
        const userId = this.socketToUserId.get(socketId);
        if (!userId) return undefined;
        return this.participants.get(userId);
    }

    // Get all participants
    public getAllParticipants(): ParticipantInfo[] {
        return Array.from(this.participants.values());
    }

    // Update participant role
    public updateParticipantRole(userId: string, role: UserRole): boolean {
        const participant = this.participants.get(userId);
        if (!participant) return false;

        participant.role = role;

        if (role === 'host') {
            // Remove old host
            if (this.hostId && this.hostId !== userId) {
                const oldHost = this.participants.get(this.hostId);
                if (oldHost) oldHost.role = 'participant';
            }
            this.hostId = userId;
            this.subHostIds.delete(userId);
        } else if (role === 'subhost') {
            this.subHostIds.add(userId);
        } else {
            this.subHostIds.delete(userId);
        }

        return true;
    }

    // Check if user is host
    public isHost(userId: string): boolean {
        return this.hostId === userId;
    }

    // Check if user is sub-host
    public isSubHost(userId: string): boolean {
        return this.subHostIds.has(userId);
    }

    // Check if user can perform host actions
    public canPerformHostAction(userId: string): boolean {
        return this.isHost(userId) || this.isSubHost(userId);
    }

    // Remove a user (properly closes all producers/consumers)
    public removePeer(socketId: string) {
        const peer = this.peers.get(socketId);
        if (!peer) return;

        console.log(`🧹 Removing peer ${socketId} (userId: ${peer.userId})`);

        // Close all producers (this stops media streams)
        peer.producers.forEach((producer, producerId) => {
            try {
                producer.close();
                console.log(`  ✅ Closed producer ${producerId}`);
            } catch (err) {
                console.warn(`  ⚠️ Error closing producer ${producerId}:`, err);
            }
        });

        // Close all consumers
        peer.consumers.forEach((consumer, consumerId) => {
            try {
                consumer.close();
                console.log(`  ✅ Closed consumer ${consumerId}`);
            } catch (err) {
                console.warn(`  ⚠️ Error closing consumer ${consumerId}:`, err);
            }
        });

        // Close all transports
        peer.transports.forEach((transport, transportId) => {
            try {
                transport.close();
                console.log(`  ✅ Closed transport ${transportId}`);
            } catch (err) {
                console.warn(`  ⚠️ Error closing transport ${transportId}:`, err);
            }
        });

        this.peers.delete(socketId);

        // Remove from participants if userId exists
        // BUT: Only remove participant if this is their only socket
        if (peer.userId) {
            const userId = peer.userId;
            this.socketToUserId.delete(socketId);

            // Check if user has other active sockets in this room
            const hasOtherSockets = Array.from(this.socketToUserId.entries())
                .some(([sid, uid]) => uid === userId && sid !== socketId);

            if (!hasOtherSockets) {
                // This was the last socket for this user, remove from participants
                this.participants.delete(userId);
                this.subHostIds.delete(userId);

                // If host left, assign new host (first sub-host or first participant)
                if (this.hostId === userId) {
                    if (this.subHostIds.size > 0) {
                        const newHostId = Array.from(this.subHostIds)[0];
                        this.updateParticipantRole(newHostId, 'host');
                    } else if (this.participants.size > 0) {
                        const newHostId = Array.from(this.participants.keys())[0];
                        this.updateParticipantRole(newHostId, 'host');
                    } else {
                        this.hostId = null;
                    }
                }
            } else {
                // User still has other sockets, just update the socketId in participant info
                const participant = this.participants.get(userId);
                if (participant) {
                    // Update to another socket if available
                    const otherSocketId = Array.from(this.socketToUserId.entries())
                        .find(([sid, uid]) => uid === userId && sid !== socketId)?.[0];
                    if (otherSocketId) {
                        participant.socketId = otherSocketId;
                    }
                }
            }
        }
    }

    // Mute/unmute participant
    public muteParticipant(userId: string, mute: boolean): boolean {
        const participant = this.participants.get(userId);
        if (!participant) return false;

        participant.isMuted = mute;
        
        // Find peer and mute/unmute audio producers
        const socketId = participant.socketId;
        const peer = this.peers.get(socketId);
        if (peer) {
            peer.producers.forEach(producer => {
                if (producer.kind === 'audio') {
                    if (mute) {
                        producer.pause();
                    } else {
                        producer.resume();
                    }
                }
            });
        }

        return true;
    }

    // Get room info
    public getRoomInfo(): RoomInfo {
        return {
            roomId: this.id,
            hostId: this.hostId || '',
            subHostIds: Array.from(this.subHostIds),
            createdAt: this.createdAt,
            settings: this.settings,
        };
    }

    // 1. Create Transport (Already likely existed, but ensuring it matches)
    public async createTransport(socketId: string) {
        const peer = this.peers.get(socketId);
        if (!peer) throw new Error('Peer not found');

        const transport = await this.router.createWebRtcTransport({
            listenIps: config.mediasoup.webRtcTransport.listenIps,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        });

        // Store it
        peer.transports.set(transport.id, transport);

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    // 2. Connect Transport (DTLS Handshake) - THIS WAS MISSING
    public async connectTransport(socketId: string, transportId: string, dtlsParameters: any) {
        const peer = this.peers.get(socketId);
        if (!peer) throw new Error('Peer not found');

        const transport = peer.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        await transport.connect({ dtlsParameters });
    }

    // 3. Produce (Publish Video/Audio) - THIS WAS MISSING
    public async produce(socketId: string, transportId: string, kind: any, rtpParameters: any) {
        const peer = this.peers.get(socketId);
        if (!peer) throw new Error('Peer not found');

        const transport = peer.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        const producer = await transport.produce({ kind, rtpParameters });

        // Store producer
        peer.producers.set(producer.id, producer);

        return producer;
    }

    // 4. Consume (Subscribe to Video/Audio) - THIS WAS MISSING
    public async consume(socketId: string, transportId: string, producerId: string, rtpCapabilities: any) {
        const peer = this.peers.get(socketId);
        if (!peer) throw new Error('Peer not found');

        // Find the producer across all peers
        let producer: Producer | null = null;
        for (const [_, p] of this.peers) {
            producer = p.producers.get(producerId) || null;
            if (producer) break;
        }

        if (!producer) {
            console.warn(`Producer ${producerId} not found in room`);
            return null;
        }

        // Check if the router can actually consume this (Codec check)
        if (!this.router.canConsume({ producerId, rtpCapabilities })) {
            console.warn(`Cannot consume producer ${producerId} - codec mismatch`);
            return null;
        }

        const transport = peer.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: false, // Start playing immediately
        });

        // Store consumer
        peer.consumers.set(consumer.id, consumer);

        return consumer;
    }

    // 5. Resume Consumer (Turn the video ON)
    public async resumeConsumer(socketId: string, consumerId: string) {
        const peer = this.peers.get(socketId);
        if (!peer) return;

        const consumer = peer.consumers.get(consumerId);
        if (!consumer) return;

        await consumer.resume();
    }
    // 6. Get all active producers (for new joiners) - excludes own socket and includes metadata
    public getActiveProducers(excludeSocketId: string, excludeUserId?: string) {
        const producerList: { producerId: string, socketId: string, kind: string, appData: any }[] = [];

        this.peers.forEach((peer, peerId) => {
            // Don't send my own streams back to me (by socketId or userId)
            if (peerId === excludeSocketId) return;
            if (excludeUserId && peer.userId === excludeUserId) return;

            peer.producers.forEach(producer => {
                producerList.push({
                    producerId: producer.id,
                    socketId: peer.id,
                    kind: producer.kind,
                    appData: producer.appData || {}
                });
            });
        });

        return producerList;
    }
}