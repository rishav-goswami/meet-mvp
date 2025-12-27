import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export const useSocket = () => {
    const socket = useRef<Socket | null>(null);

    if (!socket.current) {
        socket.current = io(SOCKET_URL, {
            transports: ['websocket'], // Force WebSocket
        });
    }

    useEffect(() => {
        const s = socket.current;
        if (!s) return;

        // --- DEBUGGING LOGS ---
        s.on('connect', () => {
            console.log('✅ SOCKET CONNECTED:', s.id);
        });

        s.on('connect_error', (err) => {
            console.error('❌ SOCKET ERROR:', err.message);
        });

        s.on('disconnect', (reason) => {
            console.warn('⚠️ SOCKET DISCONNECTED:', reason);
        });

        return () => {
            if (s.connected) s.disconnect();
        };
    }, []);

    return socket.current;
};