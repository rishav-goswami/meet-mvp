import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { useMediasoup } from './hooks/useMediasoup';
import { VideoCard } from './components/VideoCard';
import { ControlBar } from './components/ControlBar';
import { Lobby } from './components/Lobby';

function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const { socket, isConnected, connect } = useSocket(); // <--- Destructure isConnected

  // We only run useMediasoup IF we have a socket and a room
  const { joinRoom, localStream, peers, toggleMic, toggleCam, micEnabled, camEnabled } = useMediasoup(socket, roomId || '');

  const handleJoin = async (id: string, secret: string) => {
    if (id.trim() === '') {
      alert('Please enter a valid Room ID.');
      return;
    }
    if (secret.trim() === '') {
      alert('Please enter the server password to join the room.');
      return;
    }

    if (!id || !secret) return alert("Please fill all fields");

    const newSocket = connect(secret);
    if (newSocket) {
      setRoomId(id);
    }
  };

  // Trigger join ONLY when we are truly connected
  React.useEffect(() => {

    console.log(`🚪 Ready to Join? Room: ${roomId}, Connected: ${isConnected}`);

    if (roomId && isConnected && socket) {
      console.log("🚀 TRIGGERING JOIN ROOM NOW");
      joinRoom();
    }
  }, [roomId, isConnected, socket, joinRoom]);


  if (!roomId) {
    return <Lobby onJoin={handleJoin} />;
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-24 relative">
      {/* Room Header */}
      <div className="absolute top-4 left-4 bg-dark-800 px-4 py-2 rounded-lg border border-gray-700 z-10">
        <span className="text-gray-400 text-sm">Room ID:</span>
        <span className="ml-2 font-mono font-bold select-all">{roomId}</span>
      </div>

      <div className={`p-6 grid gap-4 max-w-7xl mx-auto h-[calc(100vh-80px)] items-center content-center
        ${peers.length === 0 ? 'grid-cols-1 max-w-4xl' : ''}
        ${peers.length === 1 ? 'grid-cols-2' : ''}
        ${peers.length >= 2 ? 'grid-cols-2 md:grid-cols-3' : ''}
      `}>
        {localStream && (
          <VideoCard stream={localStream} isLocal label="You" />
        )}
        {peers.map((peer) => (
          <VideoCard
            key={peer.id}
            stream={peer.stream}
            label={`User ${peer.id.slice(0, 4)}`}
          />
        ))}
      </div>
      <ControlBar onLeave={() => window.location.reload()} toggleMic={toggleMic} toggleCam={toggleCam} micEnabled={micEnabled} camEnabled={camEnabled} />
    </div>
  );
}

export default App;