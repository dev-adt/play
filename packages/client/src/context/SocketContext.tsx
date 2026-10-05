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
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  roomState: RoomClientView | null;
  joinRoom: (roomCode: string, password?: string) => Promise<{ success: boolean; error?: string; needPassword?: boolean }>;
  takeSeat: (seatIndex: number) => Promise<{ success: boolean; error?: string }>;
  leaveSeat: () => Promise<{ success: boolean; error?: string }>;
  toggleReady: () => Promise<{ success: boolean; error?: string }>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  playCards: (cardIds: string[]) => Promise<{ success: boolean; error?: string }>;
  passTurn: () => Promise<{ success: boolean; error?: string }>;
  nextGame: () => Promise<{ success: boolean; error?: string }>;
  kickPlayer: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomClientView | null>(null);
  const prevTurnRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const currentRoomCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const s = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setIsConnected(true);
      // Auto-rejoin room if code was set
      if (currentRoomCodeRef.current) {
        s.emit('join_room', { roomCode: currentRoomCodeRef.current });
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('room_state', (view: RoomClientView) => {
      // Sound triggers based on state differences
      if (view.gameState) {
        const gs = view.gameState;
        // Game just started
        if (prevPhaseRef.current !== 'playing' && gs.phase === 'playing') {
          sounds.playDeal();
        }
        // Game ended
        if (prevPhaseRef.current === 'playing' && gs.phase === 'ended') {
          sounds.playWin();
        }
        // Turn changed to me
        const mySeat = view.mySeatIndex;
        if (mySeat !== -1 && gs.currentTurnSeat === mySeat && prevTurnRef.current !== mySeat) {
          sounds.playTick();
        }

        prevPhaseRef.current = gs.phase;
        prevTurnRef.current = gs.currentTurnSeat;
      } else {
        prevPhaseRef.current = null;
        prevTurnRef.current = null;
      }

      setRoomState(view);
    });

    s.on('kicked_from_room', (data: { reason?: string }) => {
      alert(data.reason || 'Bạn đã bị mời ra khỏi phòng');
      setRoomState(null);
      window.location.href = '/';
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token]);

  const joinRoom = (roomCode: string, password?: string): Promise<{ success: boolean; error?: string; needPassword?: boolean }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Chưa kết nối tới máy chủ' });
        return;
      }
      currentRoomCodeRef.current = roomCode;
      socket.emit('join_room', { roomCode, password }, (res: any) => {
        if (res && res.success) {
          setRoomState(res.room);
          resolve({ success: true });
        } else {
          resolve(res || { success: false, error: 'Không thể vào phòng' });
        }
      });
    });
  };

  const takeSeat = (seatIndex: number): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      socket.emit('take_seat', { roomCode: roomState.code, seatIndex }, (res: any) => {
        resolve(res);
      });
    });
  };

  const leaveSeat = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      socket.emit('leave_seat', { roomCode: roomState.code }, (res: any) => {
        resolve(res);
      });
    });
  };

  const toggleReady = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      socket.emit('toggle_ready', { roomCode: roomState.code }, (res: any) => {
        resolve(res);
      });
    });
  };

  const startGame = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      socket.emit('start_game', { roomCode: roomState.code }, (res: any) => {
        resolve(res);
      });
    });
  };

  const playCards = (cardIds: string[]): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      socket.emit(
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
      if (!socket || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      socket.emit(
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
      if (!socket || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      socket.emit('next_game', { roomCode: roomState.code }, (res: any) => {
        resolve(res);
      });
    });
  };

  const kickPlayer = (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket || !roomState) {
        resolve({ success: false, error: 'Chưa vào phòng' });
        return;
      }
      socket.emit('kick_player', { roomCode: roomState.code, targetUserId }, (res: any) => {
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
        joinRoom,
        takeSeat,
        leaveSeat,
        toggleReady,
        startGame,
        playCards,
        passTurn,
        nextGame,
        kickPlayer,
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
