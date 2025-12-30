import React from 'react';
import { Radio, Square } from 'lucide-react';
import { useStreaming } from '../../hooks/useStreaming';
import { Socket } from 'socket.io-client';
import { UserRole } from '../../types';

interface StreamControlsProps {
  socket: Socket | null;
  userRole: UserRole;
  userId: string;
}

export const StreamControls: React.FC<StreamControlsProps> = ({ socket, userRole, userId }) => {
  const { isStreaming, canStartStream, startStreaming, stopStreaming } = useStreaming(socket, userRole, userId);

  if (!canStartStream) return null;

  return (
    <button
      onClick={isStreaming ? stopStreaming : startStreaming}
      className={`p-3 rounded-full transition ${
        isStreaming
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : 'bg-green-600 hover:bg-green-700 text-white'
      }`}
      aria-label={isStreaming ? 'Stop streaming' : 'Start streaming'}
    >
      {isStreaming ? <Square size={20} /> : <Radio size={20} />}
    </button>
  );
};

