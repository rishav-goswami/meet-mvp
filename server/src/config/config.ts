import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

export const config = {
    server: {
        port: process.env.PORT || 3000,
        corsOrigin: process.env.CORS_ORIGIN || '*',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    mediasoup: {
        numWorkers: Object.keys(os.cpus()).length,
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logLevel: 'warn' as const,
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        },
        router: {
            mediaCodecs: [
                { kind: 'audio' as const, mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
                { kind: 'video' as const, mimeType: 'video/VP8', clockRate: 90000, parameters: { 'x-google-start-bitrate': 1000 } },
            ],
        },
        webRtcTransport: {
            listenIps: [{
                ip: process.env.LISTEN_IP || '0.0.0.0',
                announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1', // CRITICAL for Docker
            }],
            maxIncomingBitrate: 1500000,
            initialAvailableOutgoingBitrate: 1000000,
        },
    },
};