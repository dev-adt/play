import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

export interface VoicePeer {
  userId: string;
  socketId: string;
  isMicOn: boolean;
  isSpeaking: boolean;
  isDeafened: boolean;
  isMutedByMe?: boolean;
}

interface VoiceChatContextValue {
  isMicOn: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  permissionError: string | null;
  voicePeers: Record<string, VoicePeer>; // Keyed by userId
  toggleMic: () => Promise<void>;
  toggleDeafen: () => void;
  toggleMutePeer: (userId: string) => void;
  clearPermissionError: () => void;
}

const VoiceChatContext = createContext<VoiceChatContextValue | null>(null);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const VoiceChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, roomState } = useSocket();
  const { user } = useAuth();

  const [isMicOn, setIsMicOn] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [voicePeers, setVoicePeers] = useState<Record<string, VoicePeer>>({});

  // Refs for WebRTC state
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({}); // Keyed by socketId
  const remoteAudiosRef = useRef<Record<string, HTMLAudioElement>>({}); // Keyed by socketId
  const socketToUserMapRef = useRef<Record<string, string>>({}); // socketId -> userId
  const peerMuteStateRef = useRef<Record<string, boolean>>({}); // userId -> boolean

  const currentRoomCode = roomState?.code;

  // Cleanup helper
  const closeAllPeerConnections = useCallback(() => {
    Object.values(peerConnectionsRef.current).forEach(pc => {
      try {
        pc.close();
      } catch {}
    });
    peerConnectionsRef.current = {};

    Object.values(remoteAudiosRef.current).forEach(audio => {
      try {
        audio.pause();
        audio.srcObject = null;
      } catch {}
    });
    remoteAudiosRef.current = {};
    socketToUserMapRef.current = {};
    setVoicePeers({});
  }, []);

  const stopLocalStream = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Setup Voice Activity Detection (VAD) on a MediaStream
  const setupLocalVAD = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let speakingDebounce = 0;

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !isMicOn) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;
        const nowSpeaking = average > 18; // Volume threshold

        if (nowSpeaking) {
          speakingDebounce = Date.now() + 600; // Keep speaking status for at least 600ms
          setIsSpeaking(prev => {
            if (!prev) {
              if (socket && currentRoomCode) {
                socket.emit('voice_status', {
                  roomCode: currentRoomCode,
                  isMicOn: true,
                  isSpeaking: true,
                  isDeafened,
                });
              }
              return true;
            }
            return prev;
          });
        } else if (Date.now() > speakingDebounce) {
          setIsSpeaking(prev => {
            if (prev) {
              if (socket && currentRoomCode) {
                socket.emit('voice_status', {
                  roomCode: currentRoomCode,
                  isMicOn: true,
                  isSpeaking: false,
                  isDeafened,
                });
              }
              return false;
            }
            return prev;
          });
        }
      }, 150);
    } catch (err) {
      console.warn('Cannot init AudioContext for VAD:', err);
    }
  }, [socket, currentRoomCode, isMicOn, isDeafened]);

  // Create an RTCPeerConnection for a target peer
  const createPeerConnection = useCallback((targetSocketId: string, targetUserId: string) => {
    if (peerConnectionsRef.current[targetSocketId]) {
      return peerConnectionsRef.current[targetSocketId];
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current[targetSocketId] = pc;
    socketToUserMapRef.current[targetSocketId] = targetUserId;

    // Add local tracks if microphone is active
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE Candidate
    pc.onicecandidate = event => {
      if (event.candidate && socket && currentRoomCode) {
        socket.emit('voice_signal', {
          roomCode: currentRoomCode,
          targetSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    // Receive Remote Track
    pc.ontrack = event => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      let audio = remoteAudiosRef.current[targetSocketId];
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudiosRef.current[targetSocketId] = audio;
      }
      audio.srcObject = remoteStream;
      audio.muted = isDeafened || !!peerMuteStateRef.current[targetUserId];
      audio.play().catch(e => console.log('Audio auto-play policy:', e));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        try {
          pc.close();
        } catch {}
        delete peerConnectionsRef.current[targetSocketId];
      }
    };

    return pc;
  }, [socket, currentRoomCode, isDeafened]);

  // Toggle Microphone
  const toggleMic = async () => {
    if (isMicOn) {
      // Turn off Mic
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
      }
      stopLocalStream();
      setIsMicOn(false);
      setIsSpeaking(false);

      if (socket && currentRoomCode) {
        socket.emit('voice_status', {
          roomCode: currentRoomCode,
          isMicOn: false,
          isSpeaking: false,
          isDeafened,
        });
      }
    } else {
      // Turn on Mic
      setPermissionError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        localStreamRef.current = stream;
        setIsMicOn(true);
        setupLocalVAD(stream);

        // Add tracks to existing peer connections
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          for (const [targetSocketId, pc] of Object.entries(peerConnectionsRef.current)) {
            const senders = pc.getSenders();
            const existingAudioSender = senders.find(s => s.track && s.track.kind === 'audio');
            if (existingAudioSender) {
              existingAudioSender.replaceTrack(audioTrack);
            } else {
              pc.addTrack(audioTrack, stream);
              // Renegotiate with offer
              pc.createOffer().then(offer => {
                pc.setLocalDescription(offer);
                if (socket && currentRoomCode) {
                  socket.emit('voice_signal', {
                    roomCode: currentRoomCode,
                    targetSocketId,
                    signal: offer,
                  });
                }
              }).catch(console.error);
            }
          }
        }

        if (socket && currentRoomCode) {
          socket.emit('voice_status', {
            roomCode: currentRoomCode,
            isMicOn: true,
            isSpeaking: false,
            isDeafened,
          });
        }
      } catch (err: any) {
        console.error('Microphone access denied:', err);
        setIsMicOn(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionError('Trình duyệt chưa được cấp quyền Microphone. Vui lòng nhấn vào biểu tượng ổ khóa cạnh thanh địa chỉ để Cho Phép Microphone!');
        } else if (err.name === 'NotFoundError') {
          setPermissionError('Không tìm thấy thiết bị Microphone trên máy tính hoặc điện thoại của bạn.');
        } else {
          setPermissionError('Không thể mở Microphone: ' + (err.message || 'Lỗi không xác định'));
        }
      }
    }
  };

  // Toggle Deafen (Mute whole room)
  const toggleDeafen = () => {
    setIsDeafened(prev => {
      const next = !prev;
      Object.values(remoteAudiosRef.current).forEach(audio => {
        audio.muted = next;
      });
      if (socket && currentRoomCode) {
        socket.emit('voice_status', {
          roomCode: currentRoomCode,
          isMicOn,
          isSpeaking: false,
          isDeafened: next,
        });
      }
      return next;
    });
  };

  // Toggle mute specific peer
  const toggleMutePeer = (targetUserId: string) => {
    peerMuteStateRef.current[targetUserId] = !peerMuteStateRef.current[targetUserId];
    const isMuted = peerMuteStateRef.current[targetUserId];

    // Find socketId for targetUserId
    for (const [sId, uId] of Object.entries(socketToUserMapRef.current)) {
      if (uId === targetUserId && remoteAudiosRef.current[sId]) {
        remoteAudiosRef.current[sId].muted = isDeafened || isMuted;
      }
    }

    setVoicePeers(prev => {
      if (!prev[targetUserId]) return prev;
      return {
        ...prev,
        [targetUserId]: {
          ...prev[targetUserId],
          isMutedByMe: isMuted,
        },
      };
    });
  };

  // Socket Events listener for Voice Mesh
  useEffect(() => {
    if (!socket || !currentRoomCode) {
      closeAllPeerConnections();
      stopLocalStream();
      setIsMicOn(false);
      return;
    }

    // Join room voice session
    socket.emit('voice_join', { roomCode: currentRoomCode }, (res: any) => {
      if (res?.success && Array.isArray(res.peers)) {
        res.peers.forEach((peer: { userId: string; socketId: string; displayName: string }) => {
          setVoicePeers(prev => ({
            ...prev,
            [peer.userId]: {
              userId: peer.userId,
              socketId: peer.socketId,
              isMicOn: false,
              isSpeaking: false,
              isDeafened: false,
            },
          }));

          // As the newly joined participant, initiate WebRTC offer to each existing peer
          const pc = createPeerConnection(peer.socketId, peer.userId);
          pc.createOffer({ offerToReceiveAudio: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              socket.emit('voice_signal', {
                roomCode: currentRoomCode,
                targetSocketId: peer.socketId,
                signal: pc.localDescription,
              });
            })
            .catch(err => console.error('Error creating offer for peer:', peer.socketId, err));
        });
      }
    });

    // When someone joins voice in room
    const handlePeerJoined = (data: { userId: string; socketId: string; displayName: string }) => {
      setVoicePeers(prev => ({
        ...prev,
        [data.userId]: {
          userId: data.userId,
          socketId: data.socketId,
          isMicOn: false,
          isSpeaking: false,
          isDeafened: false,
        },
      }));
      // Prepare peer connection; they will send an offer
      createPeerConnection(data.socketId, data.userId);
    };

    // When WebRTC signal is received
    const handleVoiceSignal = async (data: { fromSocketId: string; fromUserId: string; signal: any }) => {
      const { fromSocketId, fromUserId, signal } = data;
      if (!signal) return;

      const pc = createPeerConnection(fromSocketId, fromUserId);

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice_signal', {
            roomCode: currentRoomCode,
            targetSocketId: fromSocketId,
            signal: pc.localDescription,
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.type === 'candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC voice signal:', err);
      }
    };

    // When peer updates voice status (mic on/off, speaking)
    const handlePeerStatus = (data: { userId: string; socketId: string; isMicOn: boolean; isSpeaking: boolean; isDeafened: boolean }) => {
      setVoicePeers(prev => ({
        ...prev,
        [data.userId]: {
          userId: data.userId,
          socketId: data.socketId,
          isMicOn: data.isMicOn,
          isSpeaking: data.isSpeaking,
          isDeafened: data.isDeafened,
          isMutedByMe: prev[data.userId]?.isMutedByMe,
        },
      }));
    };

    // When peer leaves
    const handlePeerLeft = (data: { userId: string; socketId: string }) => {
      if (peerConnectionsRef.current[data.socketId]) {
        try {
          peerConnectionsRef.current[data.socketId].close();
        } catch {}
        delete peerConnectionsRef.current[data.socketId];
      }
      if (remoteAudiosRef.current[data.socketId]) {
        try {
          remoteAudiosRef.current[data.socketId].pause();
        } catch {}
        delete remoteAudiosRef.current[data.socketId];
      }
      delete socketToUserMapRef.current[data.socketId];

      setVoicePeers(prev => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    };

    socket.on('voice_peer_joined', handlePeerJoined);
    socket.on('voice_signal', handleVoiceSignal);
    socket.on('voice_peer_status', handlePeerStatus);
    socket.on('voice_peer_left', handlePeerLeft);

    return () => {
      socket.off('voice_peer_joined', handlePeerJoined);
      socket.off('voice_signal', handleVoiceSignal);
      socket.off('voice_peer_status', handlePeerStatus);
      socket.off('voice_peer_left', handlePeerLeft);

      if (socket && currentRoomCode) {
        socket.emit('voice_leave', { roomCode: currentRoomCode });
      }
      closeAllPeerConnections();
      stopLocalStream();
      setIsMicOn(false);
    };
  }, [socket, currentRoomCode, closeAllPeerConnections, stopLocalStream, createPeerConnection]);

  return (
    <VoiceChatContext.Provider
      value={{
        isMicOn,
        isDeafened,
        isSpeaking,
        permissionError,
        voicePeers,
        toggleMic,
        toggleDeafen,
        toggleMutePeer,
        clearPermissionError: () => setPermissionError(null),
      }}
    >
      {children}
    </VoiceChatContext.Provider>
  );
};

export const useVoiceChat = (): VoiceChatContextValue => {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error('useVoiceChat must be used within a VoiceChatProvider');
  }
  return context;
};
