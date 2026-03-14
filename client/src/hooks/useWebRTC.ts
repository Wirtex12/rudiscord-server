import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_RECONNECT_DELAY, SOCKET_RECONNECT_ATTEMPTS } from '../config';

let socket: Socket | null = null;

export const useWebRTC = (userId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ from: string; fromUsername: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Инициализация Socket.io
  useEffect(() => {
    if (!socket) {
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
        reconnectionDelay: SOCKET_RECONNECT_DELAY,
        autoConnect: true,
      });

      // Обработчики подключения
      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket?.id);
        setIsConnected(true);
        
        // Присоединяемся к комнате пользователя
        if (userId) {
          socket?.emit('join', userId);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('🔴 Socket connection error:', error.message);
        setIsConnected(false);
      });

      // Входящий звонок
      socket.on('incoming-call', (data: { from: string; fromUsername: string; offer: RTCSessionDescriptionInit }) => {
        console.log('📞 Incoming call from:', data.fromUsername);
        setIncomingCall(data);
      });

      // Звонок принят
      socket.on('call-accepted', async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
        console.log('✅ Call accepted');
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      // Звонок отклонён
      socket.on('call-rejected', () => {
        console.log('❌ Call rejected');
        setIncomingCall(null);
        setIsCalling(false);
        endCall();
      });

      // Звонок завершён
      socket.on('call-ended', () => {
        console.log('📞 Call ended');
        setIncomingCall(null);
        setIsCalling(false);
        endCall();
      });

      // ICE кандидат
      socket.on('ice-candidate', async (data: { from: string; candidate: RTCIceCandidateInit }) => {
        if (peerConnectionRef.current && data.candidate) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      });
    }

    return () => {
      // Не закрываем сокет при размонтировании, он глобальный
    };
  }, [userId]);

  // Обновляем комнату при изменении userId
  useEffect(() => {
    if (socket && userId && isConnected) {
      socket.emit('join', userId);
    }
  }, [userId, isConnected]);

  // Создание PeerConnection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          to: incomingCall?.from || '',
          candidate: event.candidate,
          from: userId || '',
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Начало звонка
  const startCall = async (targetUserId: string) => {
    if (!socket || !userId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call-user', {
        to: targetUserId,
        from: userId,
        fromUsername: localStorage.getItem('username') || 'User',
        offer: pc.localDescription,
      });

      setIsCalling(true);
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Не удалось получить доступ к камере/микрофону');
    }
  };

  // Принятие звонка
  const acceptCall = async () => {
    if (!socket || !userId || !incomingCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('accept-call', {
        to: incomingCall.from,
        from: userId,
        answer: pc.localDescription,
      });

      setIncomingCall(null);
      setIsCalling(true);
      setCallAccepted(true);
      setCallEnded(false);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  // Отклонение звонка
  const rejectCall = () => {
    if (!socket || !userId || !incomingCall) return;

    socket.emit('reject-call', {
      to: incomingCall.from,
      from: userId,
    });

    setIncomingCall(null);
  };

  // Завершение звонка
  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsCalling(false);
    setIncomingCall(null);
    setCallAccepted(false);
    setCallEnded(true);
    setIsMuted(false);
  };

  // Переключение звука
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  return {
    isConnected,
    isCalling,
    incomingCall,
    call: incomingCall,
    callAccepted,
    callEnded,
    isMuted,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    setCallAccepted,
    setCallEnded,
  };
};

export const getSocket = () => socket;
