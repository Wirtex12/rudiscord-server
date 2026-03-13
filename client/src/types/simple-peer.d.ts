declare module 'simple-peer' {
  import { EventEmitter } from 'events';
  import { Buffer } from 'buffer';

  namespace SimplePeer {
    interface Options {
      initiator?: boolean;
      channelName?: string;
      stream?: MediaStream;
      streams?: MediaStream[];
      trickle?: boolean;
      allowHalfTrickle?: boolean;
      config?: RTCConfiguration;
      sdpTransform?: (sdp: string) => string;
      wrtc?: any;
      channelConfig?: any;
    }

    interface Data {
      channel?: string;
    }

    interface SignalData {
      type?: string;
      sdp?: string;
      candidate?: string;
    }
  }

  class SimplePeer extends EventEmitter {
    constructor(opts?: SimplePeer.Options);

    send(data: string | Buffer | Uint8Array, cb?: (err?: Error) => void): void;
    signal(data: string | SimplePeer.SignalData): void;
    destroy(cb?: (err?: Error) => void): void;
    addStream(stream: MediaStream): void;
    removeStream(stream: MediaStream): void;
    replaceTrack(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack): void;

    connected: boolean;
    destroyed: boolean;
    initiating: boolean;
    localAddress: string;
    localPort: string;
    remoteAddress: string;
    remoteFamily: string;
    remotePort: string;
    remoteIsIPv4: boolean;
    remoteIsIPv6: boolean;

    on(event: 'signal', cb: (data: SimplePeer.SignalData) => void): this;
    on(event: 'connect', cb: () => void): this;
    on(event: 'data', cb: (data: Buffer) => void): this;
    on(event: 'stream', cb: (stream: MediaStream) => void): this;
    on(event: 'track', cb: (track: MediaStreamTrack, stream: MediaStream) => void): this;
    on(event: 'error', cb: (err: Error) => void): this;
    on(event: 'close', cb: () => void): this;

    write(chunk: Buffer): boolean;
  }

  export = SimplePeer;
}
