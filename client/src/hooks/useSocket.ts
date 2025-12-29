import { useRef, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false); // <--- NEW STATE
    const socketRef = useRef<Socket | null>(null);

    const connect = (token: string) => {
        if (socketRef.current?.connected) return socketRef.current;

        console.log("🔐 Attempting secure connection...");

        const newSocket = io(SOCKET_URL, {
            transports: ['websocket'],
            auth: { token },
        });

        newSocket.on('connect', () => {
            console.log('✅ SOCKET CONNECTED:', newSocket.id);
            setIsConnected(true); // <--- Trigger Re-render here
        });

        newSocket.on('connect_error', (err) => {
            console.error('❌ SOCKET ERROR:', err.message);
            setIsConnected(false);
            alert(`Connection Failed: ${err.message}`);
        });

        newSocket.on('disconnect', (reason) => {
            console.warn('⚠️ SOCKET DISCONNECTED:', reason);
            setIsConnected(false);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return newSocket;
    };

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return { socket, isConnected, connect }; // <--- Return isConnected
};