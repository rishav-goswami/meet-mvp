// client/src/types/index.ts
import { RtpCapabilities, RtpParameters, DtlsParameters, MediaKind } from 'mediasoup-client/lib/types';

export interface Peer {
  id: string; // The socket ID of the remote user
  stream: MediaStream;
}

// Responses from the server
export interface JoinRoomResponse {
  rtpCapabilities: RtpCapabilities;
}

export interface CreateTransportResponse {
  params: {
    id: string;
    iceParameters: any;
    iceCandidates: any;
    dtlsParameters: DtlsParameters;
  };
}

export interface ProduceResponse {
  id: string; // The Producer ID
}

export interface ConsumeResponse {
  params: {
    id: string; // Consumer ID
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
  };
}

// Payload for 'newProducer' event
export interface NewProducerEvent {
  producerId: string;
  socketId: string;
}