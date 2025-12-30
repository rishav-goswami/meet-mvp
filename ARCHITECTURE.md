# 🏗️ Architecture & Design Document
## Enhanced WebRTC Video Conference System

### 📋 Current Implementation Overview

**Existing Features:**
- ✅ Mediasoup SFU-based WebRTC video/audio streaming
- ✅ Multi-user room support (3-5 users)
- ✅ Basic room management with Redis
- ✅ Simple token-based authentication
- ✅ Video/audio mute/unmute controls
- ✅ Responsive video grid UI

**Tech Stack:**
- Backend: Node.js + TypeScript + Express + Socket.IO + Mediasoup
- Frontend: React + TypeScript + Vite + Mediasoup-client
- Infrastructure: Docker, Redis, Coturn (STUN/TURN), Nginx

---

## 🎯 New Features to Implement

### 1. **Authentication & User Management**
### 2. **Host Control System** (Host + Sub-host)
### 3. **Chat Feature**
### 4. **Live Streaming** (Twitch-like)
### 5. **Screen Sharing**
### 6. **Host Streaming Indicator** (Google Meet style)

---

## 🏛️ Architecture Design

### **1. Authentication & User Management**

#### **Backend Changes:**
```
User Model:
- userId: string (UUID)
- username: string
- email?: string
- role: 'host' | 'subhost' | 'participant'
- socketId: string
- joinedAt: timestamp

Room Model (Enhanced):
- roomId: string
- hostId: string (userId)
- subHostIds: string[] (userId array)
- participants: Map<userId, UserInfo>
- createdAt: timestamp
- settings: RoomSettings
```

#### **Authentication Flow:**
1. User provides credentials (username/password or OAuth)
2. Server generates JWT token with user info
3. Client stores token and sends in Socket.IO auth
4. Server validates token and attaches user info to socket

#### **Database Schema (Redis):**
```
user:{userId} -> { userId, username, email, createdAt }
room:{roomId} -> { roomId, hostId, subHostIds, createdAt, settings }
room:{roomId}:participants -> Set<userId>
room:{roomId}:messages -> List<Message> (for chat history)
```

---

### **2. Host Control System**

#### **Role Hierarchy:**
```
Host (1 per room)
  ├─ Can assign/remove sub-hosts
  ├─ Can remove any participant
  ├─ Can mute/unmute any participant
  ├─ Can start/stop live streaming
  ├─ Can control room settings
  └─ Can transfer host to another user

Sub-Host (multiple allowed)
  ├─ Can mute/unmute participants
  ├─ Can remove participants (except host)
  └─ Cannot remove host or other sub-hosts

Participant (default)
  ├─ Can control own mic/camera
  └─ Can send chat messages
```

#### **Implementation:**
- Store role in Room's participant map
- Validate permissions on each action
- Emit role change events to all participants
- UI shows role badges (Host, Sub-Host)

---

### **3. Chat Feature**

#### **Message Model:**
```typescript
interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system' | 'announcement';
  roomId: string;
}
```

#### **Features:**
- Real-time messaging via Socket.IO
- Message history (stored in Redis, last 100 messages)
- System messages (user joined/left, role changes)
- Typing indicators
- Message reactions (optional)

#### **UI Component:**
- Sidebar chat panel (toggleable)
- Message list with timestamps
- Input field with send button
- Scroll to bottom on new messages

---

### **4. Live Streaming (Twitch-like)**

#### **Architecture:**
```
Host Stream Flow:
1. Host clicks "Start Streaming"
2. Server creates a new Producer for streaming
3. Stream is broadcast to all participants
4. Optional: Stream to external RTMP endpoint (Twitch/YouTube)
5. Viewers can watch without being in the call

Viewer Mode:
- Read-only access to stream
- Chat enabled
- No video/audio from viewer
```

#### **Implementation:**
- New transport for streaming (separate from call)
- HLS/DASH output option (for external viewers)
- Stream status indicator
- Viewer count
- Stream quality controls

#### **Storage:**
```
stream:{roomId} -> { 
  isLive: boolean,
  startedAt: timestamp,
  viewerCount: number,
  streamKey: string
}
```

---

### **5. Screen Sharing**

#### **Implementation:**
- Use `getDisplayMedia()` API
- Create separate producer for screen share
- Replace or overlay main video with screen share
- Host can control who can share screen
- Multiple screen shares (if allowed)

#### **UI:**
- Screen share button in control bar
- Indicator when someone is sharing
- Option to pin screen share
- Stop sharing button

---

### **6. Host Streaming Indicator**

#### **Visual Design:**
- Small icon overlay on host's video (top-right corner)
- Icon: Broadcast/Live indicator
- Pulsing animation when streaming
- Tooltip: "Host is streaming"

---

## 📁 File Structure Changes

### **Backend:**
```
server/src/
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts          # JWT, password hashing
│   │   └── auth.middleware.ts       # Token validation
│   ├── user/
│   │   ├── User.ts                   # User model
│   │   └── UserService.ts            # User CRUD
│   ├── room/
│   │   ├── Room.ts                   # Enhanced with roles
│   │   ├── RoomManager.ts            # Enhanced
│   │   └── RoomService.ts            # Room business logic
│   ├── chat/
│   │   ├── ChatService.ts            # Chat message handling
│   │   └── chat.handler.ts           # Socket events for chat
│   ├── streaming/
│   │   ├── StreamingService.ts       # Live streaming logic
│   │   └── streaming.handler.ts      # Stream socket events
│   └── signaling/
│       └── socket.handler.ts         # Enhanced with new events
├── services/
│   ├── redis.service.ts              # Enhanced with user/room data
│   └── mediasoup.service.ts
└── types/
    ├── user.types.ts
    ├── room.types.ts
    ├── chat.types.ts
    └── streaming.types.ts
```

### **Frontend:**
```
client/src/
├── components/
│   ├── Chat/
│   │   ├── ChatPanel.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── MessageBubble.tsx
│   ├── HostControls/
│   │   ├── HostControlPanel.tsx
│   │   ├── ParticipantList.tsx
│   │   └── RoleBadge.tsx
│   ├── Streaming/
│   │   ├── StreamingIndicator.tsx
│   │   ├── StreamControls.tsx
│   │   └── ViewerMode.tsx
│   ├── ScreenShare/
│   │   └── ScreenShareControls.tsx
│   ├── VideoCard.tsx                 # Enhanced with indicators
│   ├── ControlBar.tsx                 # Enhanced with new buttons
│   └── Lobby.tsx                      # Enhanced with auth
├── hooks/
│   ├── useAuth.ts                     # Authentication hook
│   ├── useChat.ts                     # Chat functionality
│   ├── useHostControls.ts             # Host control features
│   ├── useStreaming.ts                # Streaming features
│   └── useScreenShare.ts              # Screen sharing
├── contexts/
│   ├── AuthContext.tsx                # Auth state management
│   └── RoomContext.tsx                # Room state management
└── types/
    └── index.ts                       # Enhanced types
```

---

## 🔄 Data Flow Diagrams

### **Join Room Flow (Enhanced):**
```
1. User authenticates → Get JWT token
2. Connect Socket.IO with token
3. Emit 'joinRoom' with roomId
4. Server validates token, checks room permissions
5. Server assigns role (host if first, participant otherwise)
6. Server returns room state (participants, chat history, stream status)
7. Client initializes media streams
8. Client subscribes to room events
```

### **Host Control Flow:**
```
1. Host clicks "Mute Participant"
2. Client emits 'host:muteParticipant' { userId }
3. Server validates host role
4. Server finds participant's producer
5. Server pauses producer
6. Server emits 'participantMuted' to room
7. All clients update UI
```

### **Chat Flow:**
```
1. User types message
2. Client emits 'chat:sendMessage' { message, roomId }
3. Server validates, stores in Redis
4. Server emits 'chat:newMessage' to room
5. All clients receive and display message
```

### **Streaming Flow:**
```
1. Host clicks "Start Streaming"
2. Client creates screen/camera producer
3. Server creates streaming producer
4. Server broadcasts to all participants
5. Server optionally pushes to RTMP endpoint
6. Server updates stream status in Redis
7. All clients show streaming indicator
```

---

## 🔐 Security Considerations

1. **JWT Token Expiration**: 24 hours, refresh tokens
2. **Room Access Control**: Validate user permissions
3. **Rate Limiting**: Prevent spam in chat
4. **Input Validation**: Sanitize chat messages
5. **CORS**: Proper origin validation
6. **HTTPS**: Required for production

---

## 📊 Database Schema (Redis)

### **Keys:**
```
user:{userId} -> JSON(User)
room:{roomId} -> JSON(Room)
room:{roomId}:participants -> Set<userId>
room:{roomId}:messages -> List<Message> (max 100)
room:{roomId}:host -> String(userId)
room:{roomId}:subhosts -> Set<userId>
stream:{roomId} -> JSON(StreamInfo)
```

---

## 🚀 Implementation Phases

### **Phase 1: Authentication & User Management** (Priority: High)
- JWT authentication
- User model and service
- Enhanced room with user tracking
- Role assignment

### **Phase 2: Host Controls** (Priority: High)
- Host/sub-host role system
- Permission validation
- Control actions (mute, remove, etc.)
- UI for host controls

### **Phase 3: Chat Feature** (Priority: Medium)
- Chat service and handlers
- Message storage in Redis
- Chat UI components
- Real-time message delivery

### **Phase 4: Screen Sharing** (Priority: Medium)
- Screen share producer
- UI controls
- Multiple share support

### **Phase 5: Live Streaming** (Priority: High)
- Streaming service
- Stream status management
- Viewer mode
- Streaming indicators

### **Phase 6: Polish & Optimization** (Priority: Low)
- Performance optimization
- Error handling
- UI/UX improvements
- Testing

---

## 🧪 Testing Strategy

1. **Unit Tests**: Services, utilities
2. **Integration Tests**: Socket events, room management
3. **E2E Tests**: Full user flows
4. **Load Tests**: Multiple concurrent users

---

## 📝 Notes

- All features should be backward compatible with existing rooms
- Use feature flags for gradual rollout
- Monitor performance with streaming enabled
- Consider CDN for HLS streaming if needed

