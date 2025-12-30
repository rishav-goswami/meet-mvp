import { useState, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { UserRole } from '../types';

export interface StreamInfo {
  isLive: boolean;
  startedAt: number | null;
  viewerCount: number;
  hostId: string;
}

export const useStreaming = (socket: Socket | null, userRole: UserRole, userId: string) => {
  const [streamInfo, setStreamInfo] = useState<StreamInfo>({
    isLive: false,
    startedAt: null,
    viewerCount: 0,
    hostId: '',
  });

  const canStartStream = userRole === 'host' && userId === streamInfo.hostId;

  useEffect(() => {
    if (!socket) return;

    const handleStreamStarted = (info: StreamInfo) => {
      setStreamInfo(info);
    };

    const handleStreamStopped = () => {
      setStreamInfo(prev => ({ ...prev, isLive: false, startedAt: null }));
    };

    const handleViewerCountUpdate = (count: number) => {
      setStreamInfo(prev => ({ ...prev, viewerCount: count }));
    };

    socket.on('stream:started', handleStreamStarted);
    socket.on('stream:stopped', handleStreamStopped);
    socket.on('stream:viewerCount', handleViewerCountUpdate);

    return () => {
      socket.off('stream:started', handleStreamStarted);
      socket.off('stream:stopped', handleStreamStopped);
      socket.off('stream:viewerCount', handleViewerCountUpdate);
    };
  }, [socket]);

  const startStreaming = useCallback(() => {
    if (!socket || !canStartStream) return;

    socket.emit('stream:start', {}, (response: { success?: boolean; error?: string }) => {
      if (response.error) {
        console.error('Failed to start stream:', response.error);
        alert(response.error);
      }
    });
  }, [socket, canStartStream]);

  const stopStreaming = useCallback(() => {
    if (!socket || !canStartStream) return;

    socket.emit('stream:stop', {}, (response: { success?: boolean; error?: string }) => {
      if (response.error) {
        console.error('Failed to stop stream:', response.error);
        alert(response.error);
      }
    });
  }, [socket, canStartStream]);

  return {
    streamInfo,
    isStreaming: streamInfo.isLive,
    canStartStream,
    startStreaming,
    stopStreaming,
  };
};

