import { UserRole } from './user.types';

export interface RoomSettings {
  maxParticipants: number;
  allowScreenShare: boolean;
  allowChat: boolean;
  recordingEnabled: boolean;
}

export interface RoomInfo {
  roomId: string;
  hostId: string;
  subHostIds: string[];
  createdAt: number;
  settings: RoomSettings;
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

