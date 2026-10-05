import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { sounds } from '../audio';

export interface RoomClientView {
  id: string;
  code: string;
  name: string;
  mode: 'basic' | 'fund';
  hasPassword: boolean;
  maxPlayers: number;
  ownerId: string;
  isGameActive: boolean;
  mySeatIndex: number;
  seats: ({
    userId: string;
    username: string;
    displayName: string;
    seatIndex: number;
    isReady: boolean;
    isOnline: boolean;
  } | null)[];
  nextGameAutoStartTime?: number | null;
  gameState?: {
    gameId: string;
    roomId: string;
    mode: 'basic' | 'fund';
    phase: 'dealing' | 'playing' | 'ended';
    stateVersion: number;
    mySeatIndex: number;
    myHand: any[];
    currentTurnSeat: number;
    turnDeadline: number;
    turnTimeoutSeconds: number;
    currentCombo: any | null;
    currentComboPlayerId: string | null;
    pendingDut3BichPlayerId: string | null;
    players: {
      id: string;
      displayName: string;
      seatIndex: number;
      cardCount: number;
      hasPassed: boolean;
      isOnline: boolean;
      isCurrentTurn: boolean;
    }[];
    recentPlays: any[];
    chopNotices: { text: string; createdAt: number }[];
    result?: any;
  };
  recentChats?: RoomChatMessage[];
}

export interface RoomChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderSeatIndex: number;
  text: string;
  createdAt: number;
  isSystem?: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  roomState: RoomClientView | null;
  roomChats: RoomChatMessage[];
  joinRoom: (roomCode: string, password?: string) => Promise<{ success: boolean; error?: string; needPassword?: boolean }>;
  takeSeat: (seatIndex: number) => Promise<{ success: boolean; error?: string }>;
  leaveSeat: () => Promise<{ success: boolean; error?: string }>;
  toggleReady: () => Promise<{ success: boolean; error?: string }>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  playCards: (cardIds: string[]) => Promise<{ success: boolean; error?: string }>;
  passTurn: () => Promise<{ success: boolean; error?: string }>;
  nextGame: () => Promise<{ success: boolean; error?: string }>;
  kickPlayer: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  sendRoomChat: (text: string) => Promise<{ success: boolean; error?: string }>;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomClientView | null>(null);
  const [roomChats, setRoomChats] = useState<RoomChatMessage[]>([]);
  const prevTurnRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const prevGameIdRef = useRef<string | null>(null);
  const lastPlayTimestampRef = useRef<number>(0);
  const isInitialRoomStateRef = useRef<boolean>(true);
  const currentRoomCodeRef = useRef<string | null>(null);
  const currentRoomPasswordRef = useRef<string | undefined>(undefined);
  const pendingJoinCallbacksRef = useRef<Array<(res: any) => void>>([]);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const s = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      // Auto-rejoin room if code was set or pending
      if (currentRoomCodeRef.current) {
        const code = currentRoomCodeRef.current;
        const password = currentRoomPasswordRef.current;
        s.emit('join_room', { roomCode: code, password }, (res: any) => {
          if (res && res.success) {
            setRoomState(res.room);
          }
          const cbs = [...pendingJoinCallbacksRef.current];
          pendingJoinCallbacksRef.current = [];
          cbs.forEach(cb => cb(res));
        });
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
      isInitialRoomStateRef.current = true;
    });

    s.on('room_state', (view: RoomClientView) => {
      // Sound triggers based on state differences
      if (view.gameState) {
        const gs = view.gameState;
        const isInitial = isInitialRoomStateRef.current;
        isInitialRoomStateRef.current = false;

        const latestPlay = gs.recentPlays && gs.recentPlays.length > 0
          ? gs.recentPlays[gs.recentPlays.length - 1]
          : null;

        if (!isInitial) {
          // 1. Game Start: dealing & fanfare sound
          const isGameStart =
            (prevPhaseRef.current !== 'playing' || prevGameIdRef.current !== gs.gameId) &&
            gs.phase === 'playing';

          if (isGameStart) {
            sounds.playGameStart();
          }

          // 2. Play card / Chop sound when someone plays onto the table
          if (latestPlay && latestPlay.playedAt && latestPlay.playedAt !== lastPlayTimestampRef.current) {
            if (latestPlay.playerId !== user?.userId) {
              // Opponent play
              if (latestPlay.isChop) {
                sounds.playChop();
              } else {
                sounds.playCard();
              }
            } else if (latestPlay.isChop) {
              // User's own chop
              sounds.playChop();
            }
          }

          // 3. Turn changed to me alert tick
          const mySeat = view.mySeatIndex;
          if (mySeat !== -1 && gs.currentTurnSeat === mySeat && prevTurnRef.current !== mySeat) {
            sounds.playTick();
          }
        }

        if (latestPlay?.playedAt) {
          lastPlayTimestampRef.current = latestPlay.playedAt;
        } else if (gs.phase !== 'playing') {
          lastPlayTimestampRef.current = 0;
        }

        prevPhaseRef.current = gs.phase;
        prevTurnRef.current = gs.currentTurnSeat;
        prevGameIdRef.current = gs.gameId;
      } else {
        prevPhaseRef.current = null;
        prevTurnRef.current = null;
        prevGameIdRef.current = null;
        lastPlayTimestampRef.current = 0;
        isInitialRoomStateRef.current = false;
      }

      if (view.recentChats && view.recentChats.length > 0) {
        setRoomChats(prev => {
          const map = new Map<string, RoomChatMessage>();
          prev.forEach(m => map.set(m.id, m));
          view.recentChats!.forEach(m => map.set(m.id, m));
          return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
        });
      }

      setRoomState(view);
    });

    s.on('room_chat_message', (msg: RoomChatMessage) => {
      setRoomChats(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev.slice(-49), msg];
      });
      sounds.playTick();
    });

    s.on('kicked_from_room', (data: { reason?: string }) => {
      alert(data.reason || 'Lỗi không xác định');
      setRoomState(null);
      window.location.href = '/';
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const joinRoom = (roomCode: string, password?: string): Promise<{ success: boolean; error?: string; needPassword?: boolean }> => {
    currentRoomCodeRef.current = roomCode;
    currentRoomPasswordRef.current = password;

    return new Promise((resolve) => {
      const activeSocket = socketRef.current;

      const doEmit = (s: Socket) => {
        s.emit('join_room', { roomCode, password }, (res: any) => {
          if (res && res.success) {
            setRoomState(res.room);
            resolve({ success: true });
          } else {
            resolve(res || { success: false, error: 'Không thể vào phòng' });
          }
        });
      };

      if (activeSocket && activeSocket.connected) {
        doEmit(activeSocket);
      } else {
        // Socket not connected yet - queue callback until 'connect' fires
        pendingJoinCallbacksRef.current.push(resolve);
      }
    });
  };

  const takeSeat = (seatIndex: number): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const s = socketRef.current || socket;
      if (!s || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      s.emit('take_seat', { roomCode: roomState.code, seatIndex }, (res: any) => {
        resolve(res);
      });
    });
  };

  const leaveSeat = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const s = socketRef.current || socket;
      if (!s || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      s.emit('leave_seat', { roomCode: roomState.code }, (res: any) => {
        resolve(res);
      });
    });
  };

  const toggleReady = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const s = socketRef.current || socket;
      if (!s || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      s.emit('toggle_ready', { roomCode: roomState.code }, (res: any) => {
        resolve(res);
      });
    });
  };

  const startGame = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const s = socketRef.current || socket;
      if (!s || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      s.emit('start_game', { roomCode: roomState.code }, (res: any) => {
        resolve(res);
      });
    });
  };

  const playCards = (cardIds: string[]): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const s = socketRef.current || socket;
      if (!s || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      s.emit(
        'play_cards',
        { roomCode: roomState.code, cardIds, expectedStateVersion: roomState.gameState?.stateVersion },
        (res: any) => {
          if (res && res.success) {
            sounds.playCard();
          }
          resolve(res);
        }
      );
    });
  };

  const passTurn = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const s = socketRef.current || socket;
      if (!s || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      s.emit(
        'pass_turn',
        { roomCode: roomState.code, expectedStateVersion: roomState.gameState?.stateVersion },
        (res: any) => {
          resolve(res);
        }
      );
    });
  };

  const nextGame = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const s = socketRef.current || socket;
      if (!s || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      s.emit('next_game', { roomCode: roomState.code }, (res: any) => {
        resolve(res);
      });
    });
  };

  const kickPlayer = (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const s = socketRef.current || socket;
      if (!s || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      s.emit('kick_player', { roomCode: roomState.code, targetUserId }, (res: any) => {
        resolve(res);
      });
    });
  };

  const sendRoomChat = (text: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const s = socketRef.current || socket;
      if (!s || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      s.emit('send_room_chat', { roomCode: roomState.code, text }, (res: any) => {
        resolve(res);
      });
    });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        roomState,
        roomChats,
        joinRoom,
        takeSeat,
        leaveSeat,
        toggleReady,
        startGame,
        playCards,
        passTurn,
        nextGame,
        kickPlayer,
        sendRoomChat,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
};
