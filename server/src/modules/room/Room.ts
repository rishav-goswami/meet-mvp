import { Router, WebRtcTransport, Producer, Consumer, Worker } from 'mediasoup/types';
import { config } from '../../config/config';

interface Peer {
    id: string; // socketId
    transports: WebRtcTransport[];
    producers: Producer[];
    consumers: Consumer[];
}

export class Room {
    public id: string;
    public router: Router | null = null;
    public peers: Map<string, Peer> = new Map();

    constructor(roomId: string) {
        this.id = roomId;
    }

    async init(worker: Worker) {
        this.router = await worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
    }

    addPeer(peerId: string) {
        this.peers.set(peerId, { id: peerId, transports: [], producers: [], consumers: [] });
    }

    removePeer(peerId: string) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.transports.forEach(t => t.close());
            this.peers.delete(peerId);
        }
    }

    async createTransport(peerId: string) {
        if (!this.router) throw new Error('Router not initialized');
        const transport = await this.router.createWebRtcTransport(config.mediasoup.webRtcTransport);

        const peer = this.peers.get(peerId);
        if (peer) peer.transports.push(transport);

        return transport;
    }

    // ... (Includes connectTransport, produce, consume methods from previous iteration)
    // Re-add those helper methods here for completeness when implementing

    getProducer(peerId: string, transportId: string) {
        const peer = this.peers.get(peerId);
        // Logic to find producer...
    }
}