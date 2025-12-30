import { useRef, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export const useSocket = (token?: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const connect = (authToken?: string) => {
        const tokenToUse = authToken || token;
        if (!tokenToUse) {
            console.error('No token provided for socket connection');
            return null;
        }

        if (socketRef.current?.connected) return socketRef.current;

        console.log("🔐 Attempting secure connection...");

        const newSocket = io(SOCKET_URL, {
            transports: ['websocket'],
            auth: { token: tokenToUse },
        });

        newSocket.on('connect', () => {
            console.log('✅ SOCKET CONNECTED:', newSocket.id);
            setIsConnected(true);
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
        // Auto-connect if token is provided
        if (token && !socketRef.current?.connected) {
            const newSocket = connect();
            if (newSocket) {
                // Connection will be handled by connect function
            }
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [token, connect]);

    return { socket, isConnected, connect };
};