import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useMediasoup } from './hooks/useMediasoup';
import { useScreenShare } from './hooks/useScreenShare';
import { useStreaming } from './hooks/useStreaming';
import { VideoCard } from './components/VideoCard';
import { ControlBar } from './components/ControlBar';
import { Lobby } from './components/Lobby';
import { ChatPanel } from './components/Chat/ChatPanel';
import { HostControlPanel } from './components/HostControls/HostControlPanel';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ParticipantInfo, UserRole } from './types';
function AppContent() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('participant');
  const [userId, setUserId] = useState<string>('');
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const { user, login } = useAuth();

  // Get token from user or use legacy secret
  const token = user?.token
  const { socket, isConnected } = useSocket(token);

  // We only run useMediasoup IF we have a socket and a room
  const { joinRoom, localStream, peers, toggleMic, toggleCam, micEnabled, camEnabled, device, sendTransport } = useMediasoup(socket, roomId || '');
  
  const { isSharing, startScreenShare, stopScreenShare } = useScreenShare(socket, device, sendTransport);
  const { streamInfo, isStreaming } = useStreaming(socket, userRole, userId);

  const handleJoin = async (id: string, _secret: string, providedUsername?: string) => {
    if (id.trim() === '') {
      alert('Please enter a valid Room ID.');
      return;
    }

    // Login user if not already logged in
    let displayUsername = providedUsername || username;
    if (!user) {
      if (!displayUsername) {
        displayUsername = prompt('Enter your name:') || `User ${Date.now()}`;
      }
      await login(displayUsername);
    }

    setUsername(displayUsername);
    setRoomId(id);
  };

  // Trigger join ONLY when we are truly connected
  useEffect(() => {
    console.log(`🚪 Ready to Join? Room: ${roomId}, Connected: ${isConnected}`);

    if (roomId && isConnected && socket) {
      console.log("🚀 TRIGGERING JOIN ROOM NOW");
      joinRoom();
    }
  }, [roomId, isConnected, socket, joinRoom, user, username]);

  // Listen for room events
  useEffect(() => {
    if (!socket) return;

    const handleJoinResponse = (response: any) => {
      if (response.userId) setUserId(response.userId);
      if (response.userRole) setUserRole(response.userRole);
      if (response.participants) setParticipants(response.participants);
    };

    const handleParticipantJoined = (data: any) => {
      setParticipants(prev => {
        const exists = prev.find(p => p.userId === data.userId);
        if (exists) return prev;
        return [...prev, {
          userId: data.userId,
          username: data.username,
          role: data.role,
          socketId: data.socketId,
          joinedAt: Date.now(),
          isMuted: false,
          isVideoEnabled: true,
        }];
      });
    };

    const handleParticipantLeft = (data: { userId: string }) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    };

    const handleParticipantUpdated = (data: { userId: string; isMuted?: boolean; isVideoEnabled?: boolean }) => {
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId 
          ? { ...p, ...data }
          : p
      ));
    };

    const handleParticipantRoleChanged = (data: { userId: string; role: UserRole }) => {
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId 
          ? { ...p, role: data.role }
          : p
      ));
      if (data.userId === userId) {
        setUserRole(data.role);
      }
    };

    socket.on('joinRoom', handleJoinResponse);
    socket.on('participantJoined', handleParticipantJoined);
    socket.on('participantLeft', handleParticipantLeft);
    socket.on('participantUpdated', handleParticipantUpdated);
    socket.on('participantRoleChanged', handleParticipantRoleChanged);

    return () => {
      socket.off('joinRoom', handleJoinResponse);
      socket.off('participantJoined', handleParticipantJoined);
      socket.off('participantLeft', handleParticipantLeft);
      socket.off('participantUpdated', handleParticipantUpdated);
      socket.off('participantRoleChanged', handleParticipantRoleChanged);
    };
  }, [socket, userId]);

  const handleScreenShare = () => {
    if (isSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  if (!roomId) {
    return <Lobby onJoin={handleJoin} />;
  }

  // Find participant info for each peer
  const getPeerInfo = (peerId: string) => {
    const participant = participants.find(p => p.socketId === peerId);
    return participant;
  };

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
          <VideoCard
            stream={localStream}
            isLocal
            label={username || 'You'}
            role={userRole}
            isStreaming={isStreaming && userRole === 'host'}
            viewerCount={streamInfo.viewerCount}
          />
        )}
        {peers.map((peer) => {
          const peerInfo = getPeerInfo(peer.id);
          return (
            <VideoCard
              key={peer.id}
              stream={peer.stream}
              label={peer.username || peerInfo?.username || `User ${peer.id.slice(0, 4)}`}
              role={peer.role || peerInfo?.role}
              isStreaming={false}
            />
          );
        })}
      </div>

      <ControlBar
        onLeave={() => window.location.reload()}
        toggleMic={toggleMic}
        toggleCam={toggleCam}
        micEnabled={micEnabled}
        camEnabled={camEnabled}
        onScreenShare={handleScreenShare}
        isScreenSharing={isSharing}
        socket={socket}
        userRole={userRole}
        userId={userId}
      />

      <ChatPanel
        socket={socket}
        roomId={roomId}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      <HostControlPanel
        socket={socket}
        userRole={userRole}
        participants={participants}
        isOpen={isHostControlsOpen}
        onToggle={() => setIsHostControlsOpen(!isHostControlsOpen)}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
