import { useState, useRef, useCallback } from 'react';
import { Device } from 'mediasoup-client';
import { Transport } from 'mediasoup-client/types';
import { Socket } from 'socket.io-client';
import { Peer } from '../types'; // Ensure this matches the types file I gave you earlier

export const useMediasoup = (socket: Socket | null, roomId: string) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<Peer[]>([]);

    const device = useRef<Device | null>(null);
    const sendTransport = useRef<Transport | null>(null);
    const recvTransport = useRef<Transport | null>(null);

    const joinRoom = useCallback(async () => {
        if (!socket) {
            console.error('❌ Socket is null in joinRoom');
            return;
        }

        console.log('1️⃣ Requesting to Join Room:', roomId);

        socket.emit('joinRoom', { roomId }, async (response: any) => {
            if (!response || !response.rtpCapabilities) {
                console.error('❌ Failed to join room or no RTP caps:', response);
                return;
            }

            console.log('2️⃣ Room Joined. RTP Caps received:', response.rtpCapabilities);

            try {
                // Initialize Device
                device.current = new Device();
                await device.current.load({ routerRtpCapabilities: response.rtpCapabilities });
                console.log('3️⃣ Mediasoup Device Loaded:', device.current.handlerName);

                // Initialize Transports
                await initSendTransport(device.current);
                await initRecvTransport(device.current);

            } catch (error) {
                console.error('❌ Device Load Error:', error);
            }
        });
    }, [socket, roomId]);

    const initSendTransport = async (currentDevice: Device) => {
        if (!socket) return;
        console.log('4️⃣ Initializing SEND Transport...');

        socket.emit('createWebRtcTransport', { consumer: false }, async ({ params }: any) => {
            if (params.error) {
                console.error('❌ Server failed to create send transport:', params.error);
                return;
            }

            console.log('5️⃣ Server created SEND Transport. ID:', params.id);

            // Create local transport
            sendTransport.current = currentDevice.createSendTransport(params);

            // Handle 'connect' (DTLS handshake)
            sendTransport.current.on('connect', ({ dtlsParameters }, callback, errback) => {
                console.log('6️⃣ SEND Transport connecting (DTLS)...');
                socket.emit('transport-connect', { transportId: sendTransport.current?.id, dtlsParameters });
                callback();
            });

            // Handle 'produce' (Server needs RTP params)
            sendTransport.current.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                console.log(`7️⃣ SEND Transport producing ${kind}...`);
                socket.emit('transport-produce', {
                    transportId: sendTransport.current?.id,
                    kind,
                    rtpParameters
                }, ({ id }: any) => {
                    console.log(`8️⃣ Producer Created on Server. ID: ${id}`);
                    callback({ id });
                });
            });

            // Start Camera & Mic
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                console.log('9️⃣ Local Media Stream Obtained');
                setLocalStream(stream);

                const videoTrack = stream.getVideoTracks()[0];
                const audioTrack = stream.getAudioTracks()[0];

                if (videoTrack) await sendTransport.current.produce({ track: videoTrack });
                if (audioTrack) await sendTransport.current.produce({ track: audioTrack });

            } catch (err) {
                console.error("❌ Failed to get local stream/produce:", err);
            }
        });
    };

    const initRecvTransport = async (currentDevice: Device) => {
        if (!socket) return;
        console.log('🔟 Initializing RECV Transport...');

        socket.emit('createWebRtcTransport', { consumer: true }, async ({ params }: any) => {
            if (params.error) {
                console.error('❌ Server failed to create recv transport');
                return;
            }

            // Create receiving transport
            recvTransport.current = currentDevice.createRecvTransport(params);

            // Handle 'connect'
            recvTransport.current.on('connect', ({ dtlsParameters }, callback) => {
                console.log('1️⃣1️⃣ RECV Transport connecting...');
                socket.emit('transport-recv-connect', { transportId: recvTransport.current?.id, dtlsParameters });
                callback();
            });

            // Listen for other users joining
            socket.on('newProducer', ({ producerId, socketId }: any) => {
                console.log('🔔 New Producer Announced:', producerId);
                consume(currentDevice, recvTransport.current!, producerId, socketId);
            });
        });
    };

    const consume = async (currentDevice: Device, transport: Transport, producerId: string, socketId: string) => {
        if (!socket) return;

        const { rtpCapabilities } = currentDevice;

        socket.emit('consume', {
            transportId: transport.id,
            producerId,
            rtpCapabilities
        }, async ({ params }: any) => {
            if (params.error) {
                console.error('❌ Cannot Consume:', params.error);
                return;
            }

            console.log('1️⃣2️⃣ Consuming stream:', params.id);

            const consumer = await transport.consume({
                id: params.id,
                producerId: params.producerId,
                kind: params.kind,
                rtpParameters: params.rtpParameters,
            });

            const { track } = consumer;

            // Resume on server
            socket.emit('consumer-resume', { consumerId: consumer.id });

            setPeers(prev => {
                // Dedup
                if (prev.find(p => p.id === `${socketId}-${consumer.kind}`)) return prev;
                return [...prev, { id: `${socketId}-${consumer.kind}`, stream: new MediaStream([track]) }];
            });
        });
    };

    return { joinRoom, localStream, peers };
};