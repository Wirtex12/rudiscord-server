import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';

interface UseWebRTCProps {
  userId: string;
  onCallReceived?: (from: string, fromUsername: string) => void;
}

export function useWebRTC({ userId, onCallReceived }: UseWebRTCProps) {
  const [socket, setSocket] = useState<any>(null);
  const [call, setCall] = useState<any>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [calling, setCalling] = useState(false);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const peer = useRef<Peer | null>(null);

  useEffect(() => {
    // Initialize Socket.io
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to signaling server');
      newSocket.emit('join', userId);
    });

    // Incoming call
    newSocket.on('incoming-call', (data: { from: string; fromUsername: string; offer: unknown }) => {
      setCall(data as any);
      setCalling(true);
      if (onCallReceived) {
        onCallReceived(data.from, data.fromUsername);
      }
    });

    // Call accepted
    newSocket.on('call-accepted', (data: { from: string; answer: unknown }) => {
      setCallAccepted(true);
      if (peer.current) {
        peer.current.signal(data.answer as any);
      }
    });

    // Call rejected
    newSocket.on('call-rejected', () => {
      setCallEnded(true);
      setCalling(false);
    });

    // Call ended
    newSocket.on('call-ended', () => {
      setCallEnded(true);
      setCallAccepted(false);
      setCalling(false);
      if (peer.current) {
        peer.current.destroy();
      }
    });

    // ICE candidate
    newSocket.on('ice-candidate', (data: { from: string; candidate: any }) => {
      if (peer.current && data.candidate) {
        peer.current.addStream(data.candidate);
      }
    });

    return () => {
      newSocket.disconnect();
      if (peer.current) {
        peer.current.destroy();
      }
    };
  }, [userId]);

  // Get user media
  const getMedia = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      setStream(mediaStream);
      if (myVideo.current) {
        myVideo.current.srcObject = mediaStream;
      }
      return mediaStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  };

  // Call user
  const callUser = async (to: string, fromUsername: string) => {
    const mediaStream = await getMedia();
    setCalling(true);

    peer.current = new Peer({
      initiator: true,
      trickle: false,
      stream: mediaStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.current.on('signal', (data: any) => {
      socket.emit('call-user', {
        to,
        from: userId,
        fromUsername,
        offer: data,
      });
    });

    peer.current.on('stream', (remoteStream: MediaStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });
  };

  // Accept call
  const acceptCall = async () => {
    console.log('📞 Accepting call...');
    
    // Проверка на null
    if (!call || !call.from || !call.offer) {
      console.error('❌ Cannot accept call: call data is null');
      return;
    }
    
    const mediaStream = await getMedia();
    setCallAccepted(true);

    peer.current = new Peer({
      initiator: false,
      trickle: false,
      stream: mediaStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.current.on('signal', (data: any) => {
      socket.emit('accept-call', {
        to: call.from,
        from: userId,
        answer: data,
      });
    });

    peer.current.on('stream', (remoteStream: MediaStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    peer.current.signal(call.offer);
    console.log('✅ Call accepted');
  };

  // Reject call
  const rejectCall = (callData?: any) => {
    console.log('📞 Rejecting call...');
    
    // Использовать переданные данные или состояние
    const callToReject = callData || call;
    
    // Проверка на null
    if (!callToReject || !callToReject.from) {
      console.error('❌ Cannot reject call: call data is null');
      setCall(null);
      setCalling(false);
      return;
    }

    // Отправить событие отклонения
    socket.emit('reject-call', {
      to: callToReject.from,
      from: userId,
    });
    console.log('✅ Emitted reject-call event');

    // Очистить состояние
    setCall(null);
    setCalling(false);
  };

  // End call
  const endCall = () => {
    console.log('📞 Ending call...');
    
    // 1. Send end-call event to other user
    socket.emit('end-call', {
      to: call?.from || callAccepted,
      from: userId,
    });
    console.log('✅ Emitted end-call event');
    
    // 2. Destroy peer connection
    if (peer.current) {
      peer.current.destroy();
      peer.current = null;
      console.log('✅ Peer destroyed');
    }
    
    // 3. Stop media stream (microphone)
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log('✅ Track stopped:', track.kind);
      });
      setStream(null);
    }
    
    // 4. Reset call state
    setCall(null);
    setCallEnded(true);
    setCallAccepted(false);
    setCalling(false);
    setIsMuted(false);
    
    console.log('✅ Call ended');
  };

  // Toggle mute
  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!isMuted);
      }
    }
  };

  return {
    call,
    callAccepted,
    callEnded,
    calling,
    isMuted,
    myVideo,
    userVideo,
    getMedia,
    callUser,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}
