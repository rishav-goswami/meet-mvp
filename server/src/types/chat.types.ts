export type MessageType = 'text' | 'system' | 'announcement';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: MessageType;
  roomId: string;
}

