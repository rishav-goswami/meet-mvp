export interface StreamInfo {
  roomId: string;
  isLive: boolean;
  startedAt: number | null;
  viewerCount: number;
  streamKey: string;
  hostId: string;
}

