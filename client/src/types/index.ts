// client/src/types/index.ts
import type { types } from 'mediasoup-client';

export type UserRole = 'host' | 'subhost' | 'participant';

export interface Peer {
  id: string; // The socket ID of the remote user
  userId?: string; // User ID
  username?: string; // Username
  role?: UserRole; // User role
  stream: MediaStream;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  isScreenShare?: boolean; // Indicates if this is a screen share stream
}

export interface User {
  userId: string;
  username: string;
  email?: string;
  role: UserRole;
  socketId: string;
  joinedAt: number;
}

export interface ParticipantInfo {
  userId: string;
  username: string;
  role: UserRole;
  socketId: string;
  joinedAt: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
}

export interface RoomInfo {
  roomId: string;
  hostId: string;
  subHostIds: string[];
  createdAt: number;
  settings: {
    maxParticipants: number;
    allowScreenShare: boolean;
    allowChat: boolean;
    recordingEnabled: boolean;
  };
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system' | 'announcement';
  roomId: string;
}

// Responses from the server
export interface JoinRoomResponse {
  rtpCapabilities: types.RtpCapabilities;
  peers: Array<{ producerId: string; socketId: string; kind: string; appData: any }>;
  roomInfo: RoomInfo;
  participants: ParticipantInfo[];
  userRole: UserRole;
  userId: string;
}

export interface CreateTransportResponse {
  params: {
    id: string;
    iceParameters: any;
    iceCandidates: any;
    dtlsParameters: types.DtlsParameters;
  };
}

export interface ProduceResponse {
  id: string; // The Producer ID
}

export interface ConsumeResponse {
  params: {
    id: string; // Consumer ID
    producerId: string;
    kind: types.MediaKind;
    rtpParameters: types.RtpParameters;
  };
}

// Payload for 'newProducer' event
export interface NewProducerEvent {
  producerId: string;
  socketId: string;
  userId?: string;
  username?: string;
  kind: types.MediaKind;
  appData: any;
}

export interface ParticipantJoinedEvent {
  userId: string;
  username: string;
  role: UserRole;
  socketId: string;
}

export interface ParticipantUpdatedEvent {
  userId: string;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
}

export interface ParticipantLeftEvent {
  userId: string;
  socketId?: string;
  fullyLeft?: boolean;
}

export interface ParticipantRejoinedEvent {
  userId: string;
  username: string;
  role: UserRole;
  socketId: string;
}