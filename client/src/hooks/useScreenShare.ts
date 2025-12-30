import { useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Transport } from 'mediasoup-client/types';
import { Device } from 'mediasoup-client';

export const useScreenShare = (
  socket: Socket | null,
  device: React.MutableRefObject<Device | null>,
  sendTransport: React.MutableRefObject<Transport | null>
) => {
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenProducerRef = useRef<{ close: () => void } | null>(null);

  const stopScreenShare = useCallback(() => {
    if (screenProducerRef.current) {
      screenProducerRef.current.close();
      screenProducerRef.current = null;
    }

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    setIsSharing(false);
  }, [screenStream]);

  const startScreenShare = useCallback(async () => {
    if (!socket || !device.current || !sendTransport.current) {
      console.error('Cannot start screen share: missing dependencies');
      return;
    }

    try {
      // Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(stream);
      setIsSharing(true);

      // Produce screen share
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        const producer = await sendTransport.current.produce({
          track: videoTrack,
          appData: { source: 'screen' },
        });
        screenProducerRef.current = producer;

        // Notify server
        socket.emit('transport-produce', {
          transportId: sendTransport.current.id,
          kind: 'video',
          rtpParameters: producer.rtpParameters,
        }, (response: { id?: string; error?: string }) => {
          if (response.id) {
            console.log('Screen share producer created:', response.id);
          }
        });
      }

      if (audioTrack) {
        await sendTransport.current.produce({
          track: audioTrack,
          appData: { source: 'screen' },
        });
      }

      // Handle stream end (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error('Failed to start screen share:', error);
      setIsSharing(false);
      setScreenStream(null);
    }
  }, [socket, device, sendTransport, stopScreenShare]);

  return { isSharing, screenStream, startScreenShare, stopScreenShare };
};

