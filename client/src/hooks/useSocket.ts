import { useRef, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  // In development, always connect directly to backend
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  // In production, use the same origin (nginx)
  return window.location.origin;
};

const SOCKET_URL = getSocketUrl();

export const useSocket = (token?: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Only connect if token is provided and not already connected
        if (!token || socketRef.current?.connected) {
            return;
        }

        console.log("🔐 Attempting secure connection...");

        const newSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
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

        // Cleanup: disconnect on unmount or token change
        return () => {
            newSocket.disconnect();
        };
    }, [token]); // Only re-run when token changes

    // Separate callback for manual connection if needed
    const connect = useCallback((authToken?: string) => {
        const tokenToUse = authToken || token;
        if (!tokenToUse) {
            console.error('No token provided for socket connection');
            return null;
        }

        if (socketRef.current?.connected) {
            return socketRef.current;
        }

        return socketRef.current;
    }, [token]);

    return { socket, isConnected, connect };
};