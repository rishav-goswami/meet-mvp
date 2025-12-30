import React from 'react';
import { Settings, Crown, X } from 'lucide-react';
import { useHostControls } from '../../hooks/useHostControls';
import { ParticipantInfo, UserRole } from '../../types';
import { Socket } from 'socket.io-client';
import { ParticipantList } from './ParticipantList';

interface HostControlPanelProps {
  socket: Socket | null;
  userRole: UserRole;
  participants: ParticipantInfo[];
  isOpen: boolean;
  onToggle: () => void;
}

export const HostControlPanel: React.FC<HostControlPanelProps> = ({
  socket,
  userRole,
  participants,
  isOpen,
  onToggle,
}) => {
  const { canPerformHostAction, isHost, muteParticipant, removeParticipant, assignSubHost } = useHostControls(socket, userRole);

  if (!canPerformHostAction) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-24 left-4 p-3 bg-purple-600 hover:bg-purple-700 rounded-full text-white shadow-lg z-40"
        aria-label="Open host controls"
      >
        <Settings size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 w-80 max-h-96 bg-dark-800 border border-gray-700 rounded-lg shadow-2xl flex flex-col z-40">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Crown size={20} className="text-yellow-500" />
          <h3 className="text-lg font-semibold text-white">
            {isHost ? 'Host Controls' : 'Sub-Host Controls'}
          </h3>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition"
          aria-label="Close controls"
        >
          <X size={20} />
        </button>
      </div>
      <ParticipantList
        participants={participants}
        userRole={userRole}
        onMute={muteParticipant}
        onRemove={removeParticipant}
        onAssignSubHost={assignSubHost}
      />
    </div>
  );
};

