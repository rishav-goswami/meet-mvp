import React from 'react';
import { Mic, MicOff, UserMinus, Crown, UserCheck } from 'lucide-react';
import { ParticipantInfo, UserRole } from '../../types';

interface ParticipantListProps {
  participants: ParticipantInfo[];
  userRole: UserRole;
  onMute: (userId: string, mute: boolean) => void;
  onRemove: (userId: string) => void;
  onAssignSubHost: (userId: string) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  userRole,
  onMute,
  onRemove,
  onAssignSubHost,
}) => {
  const isHost = userRole === 'host';

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {participants.length === 0 ? (
        <div className="text-center text-gray-400 py-4">No participants</div>
      ) : (
        participants.map((participant) => (
          <div
            key={participant.userId}
            className="flex items-center justify-between p-3 bg-dark-700 rounded-lg"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {participant.role === 'host' && <Crown size={16} className="text-yellow-500 flex-shrink-0" />}
              {participant.role === 'subhost' && <UserCheck size={16} className="text-purple-500 flex-shrink-0" />}
              <span className="text-sm text-white truncate">{participant.username}</span>
            </div>
            <div className="flex items-center gap-2">
              {isHost && participant.role !== 'host' && (
                <>
                  {participant.role !== 'subhost' && (
                    <button
                      onClick={() => onAssignSubHost(participant.userId)}
                      className="p-1.5 text-purple-400 hover:text-purple-300 transition"
                      title="Assign as sub-host"
                    >
                      <UserCheck size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => onMute(participant.userId, !participant.isMuted)}
                    className="p-1.5 text-gray-400 hover:text-white transition"
                    title={participant.isMuted ? 'Unmute' : 'Mute'}
                  >
                    {participant.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button
                    onClick={() => onRemove(participant.userId)}
                    className="p-1.5 text-red-400 hover:text-red-300 transition"
                    title="Remove participant"
                  >
                    <UserMinus size={16} />
                  </button>
                </>
              )}
              {userRole === 'subhost' && participant.role === 'participant' && (
                <button
                  onClick={() => onMute(participant.userId, !participant.isMuted)}
                  className="p-1.5 text-gray-400 hover:text-white transition"
                  title={participant.isMuted ? 'Unmute' : 'Mute'}
                >
                  {participant.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

