import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { Socket } from 'socket.io-client';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatPanelProps {
  socket: Socket | null;
  roomId: string | null;
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ socket, roomId, isOpen, onToggle }) => {
  const { messages, sendMessage, isLoading } = useChat(socket, roomId);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-4 p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white shadow-lg z-40"
        aria-label="Open chat"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 w-80 h-96 bg-dark-800 border border-gray-700 rounded-lg shadow-2xl flex flex-col z-40">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Chat</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition"
          aria-label="Close chat"
        >
          <X size={20} />
        </button>
      </div>
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
};

