import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor } from 'lucide-react';
import { StreamControls } from './Streaming/StreamControls';
import { UserRole } from '../types';
import { Socket } from 'socket.io-client';

interface Props {
  onLeave: () => void;
  micEnabled: boolean;
  camEnabled: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  onScreenShare?: () => void;
  isScreenSharing?: boolean;
  socket?: Socket | null;
  userRole?: UserRole;
  userId?: string;
}

export const ControlBar: React.FC<Props> = ({
  onLeave,
  micEnabled,
  camEnabled,
  toggleMic,
  toggleCam,
  onScreenShare,
  isScreenSharing,
  socket,
  userRole,
  userId,
}) => {
  return (
    <div className="fixed bottom-0 left-0 w-full h-20 bg-dark-900 border-t border-gray-700 flex items-center justify-center gap-4 z-50">
      <button
        onClick={toggleMic}
        aria-label="Toggle microphone"
        className="p-4 rounded-full bg-dark-800 hover:bg-gray-600 transition text-white">
        {micEnabled ? <Mic size={24} /> : <MicOff size={24} />}
      </button>
      <button
        onClick={toggleCam}
        aria-label="Toggle camera"
        className="p-4 rounded-full bg-dark-800 hover:bg-gray-600 transition text-white">
        {camEnabled ? <Video size={24} /> : <VideoOff size={24} />}
      </button>
      {onScreenShare && (
        <button
          onClick={onScreenShare}
          aria-label={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
          className={`p-4 rounded-full transition ${
            isScreenSharing
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-dark-800 hover:bg-gray-600 text-white'
          }`}>
          <Monitor size={24} />
        </button>
      )}
      {socket && userRole && userId && (
        <StreamControls socket={socket} userRole={userRole} userId={userId} />
      )}
      <button
        onClick={onLeave}
        className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition text-white px-8"
      >
        <PhoneOff size={24} />
      </button>
    </div>
  );
};