import React from 'react';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isSystem = message.type === 'system';
  const isAnnouncement = message.type === 'announcement';

  if (isSystem || isAnnouncement) {
    return (
      <div className="text-center py-2">
        <span className="text-xs text-gray-500 italic">{message.message}</span>
      </div>
    );
  }

  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-sm font-semibold text-blue-400">{message.username}</span>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
      <div className="bg-dark-700 rounded-lg px-3 py-2 text-sm text-white">
        {message.message}
      </div>
    </div>
  );
};

