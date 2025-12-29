// client/src/types/index.ts
import type { types } from 'mediasoup-client';

export interface Peer {
  id: string; // The socket ID of the remote user
  stream: MediaStream;
}

// Responses from the server
export interface JoinRoomResponse {
  rtpCapabilities: types.RtpCapabilities;
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
}