import { useState, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { ChatMessage } from '../types';

export const useChat = (socket: Socket | null, roomId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history when joining room
  useEffect(() => {
    if (!socket || !roomId) return;

    let mounted = true;
    setIsLoading(true);
    
    socket.emit('chat:getHistory', (response: { messages: ChatMessage[] }) => {
      if (mounted) {
        if (response.messages) {
          setMessages(response.messages);
        }
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [socket, roomId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on('chat:newMessage', handleNewMessage);

    return () => {
      socket.off('chat:newMessage', handleNewMessage);
    };
  }, [socket]);

  const sendMessage = useCallback((message: string) => {
    if (!socket || !message.trim()) return;

    socket.emit('chat:sendMessage', { message }, (response: { success?: boolean; error?: string; messageId?: string }) => {
      if (response.error) {
        console.error('Failed to send message:', response.error);
      }
    });
  }, [socket]);

  return { messages, sendMessage, isLoading };
};

