import { useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { UserRole } from '../types';

export const useHostControls = (socket: Socket | null, userRole: UserRole) => {
  const canPerformHostAction = userRole === 'host' || userRole === 'subhost';

  const muteParticipant = useCallback((targetUserId: string, mute: boolean) => {
    if (!socket || !canPerformHostAction) return;

    socket.emit('host:muteParticipant', { targetUserId, mute }, (response: { success?: boolean; error?: string }) => {
      if (response.error) {
        console.error('Failed to mute participant:', response.error);
        alert(response.error);
      }
    });
  }, [socket, canPerformHostAction]);

  const removeParticipant = useCallback((targetUserId: string) => {
    if (!socket || userRole !== 'host') return;

    if (!confirm('Are you sure you want to remove this participant?')) {
      return;
    }

    socket.emit('host:removeParticipant', { targetUserId }, (response: { success?: boolean; error?: string }) => {
      if (response.error) {
        console.error('Failed to remove participant:', response.error);
        alert(response.error);
      }
    });
  }, [socket, userRole]);

  const assignSubHost = useCallback((targetUserId: string) => {
    if (!socket || userRole !== 'host') return;

    socket.emit('host:assignSubHost', { targetUserId }, (response: { success?: boolean; error?: string }) => {
      if (response.error) {
        console.error('Failed to assign sub-host:', response.error);
        alert(response.error);
      } else {
        alert('Sub-host assigned successfully');
      }
    });
  }, [socket, userRole]);

  return {
    canPerformHostAction,
    isHost: userRole === 'host',
    isSubHost: userRole === 'subhost',
    muteParticipant,
    removeParticipant,
    assignSubHost,
  };
};

