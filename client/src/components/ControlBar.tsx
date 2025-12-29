import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

interface Props {
  onLeave: () => void;
  // Add toggle props later for bonus features
}

export const ControlBar: React.FC<Props> = ({ onLeave }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full h-20 bg-dark-900 border-t border-gray-700 flex items-center justify-center gap-4 z-50">
      <button className="p-4 rounded-full bg-dark-800 hover:bg-gray-600 transition text-white">{""}
        <Mic size={24} />
      </button>
      <button className="p-4 rounded-full bg-dark-800 hover:bg-gray-600 transition text-white">{""}
        <Video size={24} />
      </button>
      <button
        onClick={onLeave}
        className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition text-white px-8">{""}
        <PhoneOff size={24} />
      </button>
    </div>
  );
};