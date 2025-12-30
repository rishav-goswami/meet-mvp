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
    const audioProducerRef = useRef<any | null>(null);
    const videoProducerRef = useRef<any | null>(null);

    const [micEnabled, setMicEnabled] = useState<boolean>(true);
    const [camEnabled, setCamEnabled] = useState<boolean>(true);

    const joinRoom = useCallback(async () => {
        if (!socket) return;

        console.log('1️⃣ Requesting to Join Room:', roomId);

        socket.emit('joinRoom', { roomId }, async (response: any) => {
            if (!response || !response.rtpCapabilities) {
                console.error('❌ Failed to join room:', response);
                return;
            }

            console.log('2️⃣ Room Joined. Existing Peers:', response.peers?.length);

            try {
                device.current = new Device();
                await device.current.load({ routerRtpCapabilities: response.rtpCapabilities });

                // Init Transports
                await initSendTransport(device.current);
                await initRecvTransport(device.current, response.peers || []); // <--- PASS PEERS HERE

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
            sendTransport.current.on('connect', ({ dtlsParameters }, callback, _errback) => {
                console.log('6️⃣ SEND Transport connecting (DTLS)...');
                socket.emit('transport-connect', { transportId: sendTransport.current?.id, dtlsParameters });
                callback();
            });

            // Handle 'produce' (Server needs RTP params)
            sendTransport.current.on('produce', async ({ kind, rtpParameters, appData }, callback, _errback) => {
                console.log(`7️⃣ SEND Transport producing ${kind}${appData?.source === 'screen' ? ' (SCREEN SHARE)' : ''}...`);
                socket.emit('transport-produce', {
                    transportId: sendTransport.current?.id,
                    kind,
                    rtpParameters,
                    appData: appData || {}
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

                if (videoTrack) {
                    try {
                        const videoProducer = await sendTransport.current!.produce({ track: videoTrack });
                        videoProducerRef.current = videoProducer;
                        setCamEnabled(Boolean(videoTrack.enabled));
                    } catch (err) {
                        console.error('❌ Video produce failed', err);
                    }
                }

                if (audioTrack) {
                    try {
                        const audioProducer = await sendTransport.current!.produce({ track: audioTrack });
                        audioProducerRef.current = audioProducer;
                        setMicEnabled(Boolean(audioTrack.enabled));
                    } catch (err) {
                        console.error('❌ Audio produce failed', err);
                    }
                }

            } catch (err) {
                console.error("❌ Failed to get local stream/produce:", err);
            }
        });
    };

    // Modify signature to accept existingPeers
    const initRecvTransport = async (currentDevice: Device, existingPeers: any[]) => {
        if (!socket) return;
        console.log('🔟 Initializing RECV Transport...');

        socket.emit('createWebRtcTransport', { consumer: true }, async ({ params }: any) => {
            if (params.error) return console.error('❌ Recv Transport Error');

            // Create receiving transport
            recvTransport.current = currentDevice.createRecvTransport(params);

            // Handle 'connect'
            recvTransport.current.on('connect', ({ dtlsParameters }, callback) => {
                socket.emit('transport-recv-connect', { transportId: recvTransport.current?.id, dtlsParameters });
                callback();
            });

            // Listen for NEW users
            const newProducerHandler = ({ producerId, socketId, kind, appData }: any) => {
                const isScreenShare = appData?.source === 'screen';
                console.log(`🔔 New Producer Announced: ${producerId} (${kind}${isScreenShare ? ' - SCREEN SHARE' : ''})`);
                consume(currentDevice, recvTransport.current!, producerId, socketId, isScreenShare);
            };
            socket.on('newProducer', newProducerHandler);

            // Listen for participant leaving to cleanup peers
            const participantLeftHandler = ({ socketId, userId, fullyLeft }: any) => {
                if (socketId) {
                    console.log(`🧹 Cleaning up peer: ${socketId} (userId: ${userId}, fullyLeft: ${fullyLeft})`);
                    setPeers(prev => {
                        // Remove all streams from this socket (including screen shares)
                        // Also filter by userId if provided to catch all instances
                        if (userId) {
                            // This will be handled by filtering socketId, but we can also check userId if stored
                            return prev.filter(p => {
                                const peerSocketId = p.isScreenShare ? p.id.replace('-screen', '') : p.id;
                                return peerSocketId !== socketId;
                            });
                        }
                        return prev.filter(p => {
                            const peerSocketId = p.isScreenShare ? p.id.replace('-screen', '') : p.id;
                            return peerSocketId !== socketId;
                        });
                    });
                }
            };
            socket.on('participantLeft', participantLeftHandler);

            // --- CRITICAL FIX: CONSUME EXISTING USERS NOW ---
            // Get our own socketId to filter out our own streams
            const ownSocketId = socket.id;
            for (const peer of existingPeers) {
                // Skip our own streams (shouldn't happen, but safety check)
                if (peer.socketId === ownSocketId) {
                    console.log(`⚠️ Skipping own stream: ${peer.producerId}`);
                    continue;
                }
                const isScreenShare = peer.appData?.source === 'screen';
                console.log(`♻️ Consuming existing peer ${peer.socketId} (${peer.kind}${isScreenShare ? ' - SCREEN SHARE' : ''})`);
                await consume(currentDevice, recvTransport.current!, peer.producerId, peer.socketId, isScreenShare);
            }

            // Cleanup function
            return () => {
                socket.off('newProducer', newProducerHandler);
                socket.off('participantLeft', participantLeftHandler);
            };
        });
    };

    const consume = async (currentDevice: Device, transport: Transport, producerId: string, socketId: string, isScreenShare: boolean = false) => {
        if (!socket) return;

        // Safety check: Don't consume our own streams
        if (socketId === socket.id) {
            console.warn(`⚠️ Attempted to consume own stream, skipping: ${producerId}`);
            return;
        }

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

            const consumer = await transport.consume({
                id: params.id,
                producerId: params.producerId,
                kind: params.kind,
                rtpParameters: params.rtpParameters,
            });

            // Resume on server (even if already playing, this ensures it's active)
            socket.emit('consumer-resume', { consumerId: consumer.id }, () => {
                // Force track to be enabled after resume
                if (consumer.track) {
                    consumer.track.enabled = true;
                    console.log(`✅ Consumer ${consumer.id} resumed, track enabled: ${consumer.track.enabled}`);
                }
            });

            // --- MERGE LOGIC START ---
            setPeers(prev => {
                // For screen shares, create a separate peer entry
                if (isScreenShare && consumer.kind === 'video') {
                    const screenShareId = `${socketId}-screen`;
                    // Remove any existing screen share from this user
                    const filtered = prev.filter(p => p.id !== screenShareId);
                    console.log(`📺 Adding screen share from ${socketId}, track ID: ${consumer.track.id}, enabled: ${consumer.track.enabled}`);
                    const newStream = new MediaStream([consumer.track]);
                    // Ensure track is enabled
                    consumer.track.enabled = true;
                    return [...filtered, {
                        id: screenShareId,
                        stream: newStream,
                        isScreenShare: true
                    }];
                }

                const existingPeer = prev.find(p => p.id === socketId && !p.isScreenShare);

                if (existingPeer) {
                    // 1. If peer exists, check if track already exists
                    const trackExists = existingPeer.stream.getTracks().some(t => t.id === consumer.track.id);
                    if (!trackExists) {
                        console.log(`🔀 Merging ${consumer.kind} track into existing user ${socketId}`);
                        existingPeer.stream.addTrack(consumer.track);
                        consumer.track.enabled = true;
                    }
                    return [...prev]; // Return new array to force React to update
                } else {
                    // 2. If new peer, create new entry
                    console.log(`👤 New user detected ${socketId}, adding ${consumer.kind}`);
                    consumer.track.enabled = true;
                    const newPeer = { 
                        id: socketId, 
                        stream: new MediaStream([consumer.track]),
                        isScreenShare: false
                    };
                    return [...prev, newPeer];
                }
            });
            // --- MERGE LOGIC END ---
        });
    };

    const toggleMic = useCallback(() => {
        if (!localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (!audioTrack) return;

        const newState = !audioTrack.enabled;
        audioTrack.enabled = newState;
        setMicEnabled(newState);

        try {
            if (audioProducerRef.current) {
                if (!newState) audioProducerRef.current.pause();
                else audioProducerRef.current.resume();
            }
        } catch (err) {
            console.warn('⚠️ Failed to pause/resume audio producer', err);
        }
    }, [localStream]);

    const toggleCam = useCallback(() => {
        if (!localStream) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        const newState = !videoTrack.enabled;
        videoTrack.enabled = newState;
        setCamEnabled(newState);

        try {
            if (videoProducerRef.current) {
                if (!newState) videoProducerRef.current.pause();
                else videoProducerRef.current.resume();
            }
        } catch (err) {
            console.warn('⚠️ Failed to pause/resume video producer', err);
        }
    }, [localStream]);

    return { joinRoom, localStream, peers, toggleMic, toggleCam, micEnabled, camEnabled, device, sendTransport, videoProducerRef, setLocalStream };
};