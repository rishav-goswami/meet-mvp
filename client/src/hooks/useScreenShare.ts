import { useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Transport } from 'mediasoup-client/types';
import { Device } from 'mediasoup-client';

export const useScreenShare = (
  socket: Socket | null,
  device: React.MutableRefObject<Device | null>,
  sendTransport: React.MutableRefObject<Transport | null>,
  videoProducerRef?: React.MutableRefObject<any | null>,
  setLocalStream?: React.Dispatch<React.SetStateAction<MediaStream | null>>,
  localStream?: MediaStream | null
) => {
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenProducerRef = useRef<{ close: () => void } | null>(null);
  const originalLocalStreamRef = useRef<MediaStream | null>(null);

  const stopScreenShare = useCallback(() => {
    if (screenProducerRef.current) {
      screenProducerRef.current.close();
      screenProducerRef.current = null;
    }

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    // Restore original local stream (camera)
    if (setLocalStream && originalLocalStreamRef.current) {
      setLocalStream(originalLocalStreamRef.current);
      originalLocalStreamRef.current = null;
    }

    // Resume camera video producer if it was paused
    if (videoProducerRef?.current) {
      try {
        videoProducerRef.current.resume();
        console.log('✅ Resumed camera video producer');
      } catch (err) {
        console.warn('⚠️ Failed to resume camera video producer', err);
      }
    }

    setIsSharing(false);
  }, [screenStream, videoProducerRef, setLocalStream]);

  const startScreenShare = useCallback(async () => {
    if (!socket || !device.current || !sendTransport.current) {
      console.error('Cannot start screen share: missing dependencies');
      return;
    }

    try {
      // Pause camera video producer to avoid SSRC conflict
      if (videoProducerRef?.current) {
        try {
          videoProducerRef.current.pause();
          console.log('⏸️ Paused camera video producer for screen share');
        } catch (err) {
          console.warn('⚠️ Failed to pause camera video producer', err);
        }
      }

      // Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(stream);
      setIsSharing(true);

      // Update local stream to show screen share instead of camera
      if (setLocalStream && localStream) {
        // Save original stream to restore later
        originalLocalStreamRef.current = localStream;
        
        // Create new stream with screen share video track
        const screenVideoTrack = stream.getVideoTracks()[0];
        const originalAudioTrack = localStream.getAudioTracks()[0];
        
        if (screenVideoTrack) {
          const newStream = new MediaStream();
          if (screenVideoTrack) newStream.addTrack(screenVideoTrack);
          if (originalAudioTrack) newStream.addTrack(originalAudioTrack);
          setLocalStream(newStream);
          console.log('✅ Updated local stream to show screen share');
        }
      }

      // Produce screen share
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        // The produce() call will automatically trigger the transport's 'produce' event
        // which is handled by useMediasoup's event handler that emits 'transport-produce' to server
        const producer = await sendTransport.current.produce({
          track: videoTrack,
          appData: { source: 'screen' },
        });
        screenProducerRef.current = producer;
        console.log('✅ Screen share video producer created:', producer.id);
      }

      if (audioTrack) {
        // Screen share audio (if available)
        await sendTransport.current.produce({
          track: audioTrack,
          appData: { source: 'screen' },
        });
        console.log('✅ Screen share audio producer created');
      }

      // Handle stream end (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error('Failed to start screen share:', error);
      setIsSharing(false);
      setScreenStream(null);
      
      // Restore original local stream if it was changed
      if (setLocalStream && originalLocalStreamRef.current) {
        setLocalStream(originalLocalStreamRef.current);
        originalLocalStreamRef.current = null;
      }
      
      // Resume camera if screen share failed
      if (videoProducerRef?.current) {
        try {
          videoProducerRef.current.resume();
        } catch (err) {
          console.warn('⚠️ Failed to resume camera after screen share error', err);
        }
      }
    }
  }, [socket, device, sendTransport, stopScreenShare, videoProducerRef, setLocalStream, localStream]);

  return { isSharing, screenStream, startScreenShare, stopScreenShare };
};

