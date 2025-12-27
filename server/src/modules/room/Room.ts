import { Router, WebRtcTransport, Producer, Consumer } from 'mediasoup/types';
import { config } from '../../config/config';

interface Peer {
    id: string; // socketId
    transports: Map<string, WebRtcTransport>; // transportId -> Transport
    producers: Map<string, Producer>;         // producerId -> Producer
    consumers: Map<string, Consumer>;         // consumerId -> Consumer
}

export class Room {
    public id: string;
    public router: Router;
    private peers: Map<string, Peer> = new Map(); // socketId -> Peer

    constructor(roomId: string, router: Router) {
        this.id = roomId;
        this.router = router;
    }

    // Add a user to the room
    public addPeer(socketId: string) {
        this.peers.set(socketId, {
            id: socketId,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
        });
    }

    // Remove a user
    public removePeer(socketId: string) {
        const peer = this.peers.get(socketId);
        if (!peer) return;

        // Close everything
        peer.transports.forEach(t => t.close());
        this.peers.delete(socketId);
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

        // Check if the router can actually consume this (Codec check)
        if (!this.router.canConsume({ producerId, rtpCapabilities })) {
            console.warn(`Cannot consume producer ${producerId}`);
            return null;
        }

        const transport = peer.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: true, // Start paused, wait for client to resume
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
    // 6. Get all active producers (for new joiners)
    public getActiveProducers(excludeSocketId: string) {
        const producerList: { producerId: string, socketId: string }[] = [];

        this.peers.forEach((peer, peerId) => {
            if (peerId === excludeSocketId) return; // Don't send my own streams back to me

            peer.producers.forEach(producer => {
                producerList.push({
                    producerId: producer.id,
                    socketId: peer.id
                });
            });
        });

        return producerList;
    }
}