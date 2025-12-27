import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { useMediasoup } from './hooks/useMediasoup';
import { VideoCard } from './components/VideoCard';
import { ControlBar } from './components/ControlBar';

function App() {
  const [joined, setJoined] = useState(false);
  const socket = useSocket();
  const roomId = "demo-room"; // Hardcoded for MVP
  const { joinRoom, localStream, peers } = useMediasoup(socket, roomId);

  const handleJoin = async () => {
    await joinRoom();
    setJoined(true);
  };

  if (!joined) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-dark-900">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-white tracking-tight">Meet MVP</h1>
          <p className="text-gray-400">Join the secure video room</p>
          <button
            onClick={handleJoin}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-24">
      {/* Grid Layout - Auto adjusts based on peer count */}
      <div className={`p-6 grid gap-4 max-w-7xl mx-auto h-[calc(100vh-80px)] items-center content-center
        ${peers.length === 0 ? 'grid-cols-1 max-w-4xl' : ''}
        ${peers.length === 1 ? 'grid-cols-2' : ''}
        ${peers.length >= 2 ? 'grid-cols-2 md:grid-cols-3' : ''}
      `}>
        {/* Local Video */}
        {localStream && (
          <VideoCard stream={localStream} isLocal label="You" />
        )}

        {/* Remote Peers */}
        {peers.map((peer) => (
          <VideoCard
            key={peer.id}
            stream={peer.stream}
            label={`User ${peer.id.slice(0, 4)}`}
          />
        ))}
      </div>

      <ControlBar onLeave={() => window.location.reload()} />
    </div>
  );
}

export default App;