import crypto from 'crypto';
import { GameMode } from '@tienlen/shared';
import { db, RoomRow } from '../db/database.js';
import { GameInstance, GameStateClientView } from '../game/GameInstance.js';
import { comparePassword, hashPassword } from '../auth/auth.js';

export interface RoomMember {
  userId: string;
  username: string;
  displayName: string;
  balance: number;
  seatIndex: number;
  isReady: boolean;
  isOnline: boolean;
  socketId: string | null;
  offlineSince?: number | null;
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

export interface RoomClientView {
  id: string;
  code: string;
  name: string;
  mode: GameMode;
  betAmount: number;
  hasPassword: boolean;
  maxPlayers: number;
  ownerId: string;
  isGameActive: boolean;
  mySeatIndex: number;
  seats: (RoomMember | null)[];
  nextGameAutoStartTime?: number | null;
  gameState?: GameStateClientView;
  recentChats?: RoomChatMessage[];
}

export class Room {
  public id: string;
  public code: string;
  public name: string;
  public mode: GameMode;
  public betAmount: number = 10;
  public passwordHash: string | null;
  public maxPlayers: number;
  public ownerId: string;
  public seats: (RoomMember | null)[] = [null, null, null, null];
  public activeGame: GameInstance | null = null;
  public gameCount: number = 0;
  public previousWinnerId: string | null = null;
  public nextGameAutoStartTimer: NodeJS.Timeout | null = null;
  public nextGameAutoStartTime: number | null = null;
  public disconnectTimers = new Map<string, NodeJS.Timeout>();
  public recentChats: RoomChatMessage[] = [];

  private broadcastFn: (room: Room) => void;

  constructor(options: {
    id: string;
    code: string;
    name: string;
    mode: GameMode;
    betAmount?: number;
    passwordHash: string | null;
    maxPlayers: number;
    ownerId: string;
    broadcastFn: (room: Room) => void;
  }) {
    this.id = options.id;
    this.code = options.code;
    this.name = options.name;
    this.mode = options.mode;
    this.betAmount = options.betAmount || 10;
    this.passwordHash = options.passwordHash;
    this.maxPlayers = options.maxPlayers;
    this.ownerId = options.ownerId;
    this.broadcastFn = options.broadcastFn;
    this.seats = Array(options.maxPlayers).fill(null);
  }

  public getMemberByUserId(userId: string): RoomMember | null {
    return this.seats.find(s => s && s.userId === userId) || null;
  }

  public takeSeat(
    user: { id: string; username: string; displayName: string; balance?: number },
    seatIndex: number,
    socketId: string
  ): { success: boolean; error?: string } {
    // Clear disconnect timer if any
    if (this.disconnectTimers.has(user.id)) {
      clearTimeout(this.disconnectTimers.get(user.id)!);
      this.disconnectTimers.delete(user.id);
    }

    // If game is active: allow reconnecting to own seat OR taking an empty waiting seat if < 4 players
    if (this.activeGame && this.activeGame.phase === 'playing') {
      const existing = this.getMemberByUserId(user.id);
      if (existing) {
        existing.isOnline = true;
        existing.socketId = socketId;
        existing.offlineSince = null;
        if (this.activeGame.players.some(p => p.id === user.id)) {
          this.activeGame.setPlayerOnline(user.id, true);
        }
        this.broadcast();
        return { success: true };
      }

      // Check if room is already full (max 4 seated players)
      const seatedCount = this.seats.filter(s => s !== null).length;
      if (seatedCount >= this.maxPlayers) {
        return { success: false, error: 'Phòng đã đủ 4 người chơi, vui lòng làm khán giả theo dõi!' };
      }

      if (seatIndex < 0 || seatIndex >= this.maxPlayers) {
        return { success: false, error: 'Vị trí ghế không hợp lệ' };
      }

      if (this.seats[seatIndex] !== null) {
        return { success: false, error: 'Ghế này đã có người ngồi' };
      }

      // Allow spectator to take seat as a waiting player for next game!
      const initialBal = user.balance !== undefined ? user.balance : 1000;
      this.seats[seatIndex] = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        balance: initialBal,
        seatIndex,
        isReady: true,
        isOnline: true,
        socketId,
      };

      db.getUserById(user.id).then(u => {
        if (u && this.seats[seatIndex]?.userId === user.id) {
          this.seats[seatIndex]!.balance = u.balance;
          this.broadcast();
        }
      }).catch(() => {});

      this.addChatMessage(
        { id: 'system', displayName: 'Hệ thống' },
        `🔔 ${user.displayName} đã vào ghế ${seatIndex + 1} chờ ván tiếp theo.`,
        true
      );

      this.broadcast();
      return { success: true };
    }

    if (seatIndex < 0 || seatIndex >= this.maxPlayers) {
      return { success: false, error: 'Vị trí ghế không hợp lệ' };
    }

    // Check if user is already seated
    const currentMember = this.getMemberByUserId(user.id);
    if (currentMember) {
      if (currentMember.seatIndex === seatIndex) {
        currentMember.socketId = socketId;
        currentMember.isOnline = true;
        this.broadcast();
        return { success: true };
      }
      // Vacate old seat
      this.seats[currentMember.seatIndex] = null;
    }

    // Check if target seat is occupied
    if (this.seats[seatIndex] !== null) {
      return { success: false, error: 'Ghế này đã có người ngồi' };
    }

    const initialBal = user.balance !== undefined ? user.balance : 1000;
    this.seats[seatIndex] = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      balance: initialBal,
      seatIndex,
      isReady: user.id === this.ownerId, // Room owner is ready by default
      isOnline: true,
      socketId,
    };

    db.getUserById(user.id).then(u => {
      if (u && this.seats[seatIndex]?.userId === user.id) {
        this.seats[seatIndex]!.balance = u.balance;
        this.broadcast();
      }
    }).catch(() => {});

    this.broadcast();
    return { success: true };
  }

  public leaveSeat(userId: string): { success: boolean; error?: string } {
    if (this.activeGame && this.activeGame.phase === 'playing') {
      const inGame = this.activeGame.players.some(p => p.id === userId);
      if (inGame) {
        const member = this.getMemberByUserId(userId);
        if (member) {
          member.isOnline = false;
          member.socketId = null;
          this.activeGame.setPlayerOnline(userId, false);
          this.broadcast();
        }
        return { success: true };
      }

      // Waiting player who hasn't been dealt cards yet can leave seat cleanly
      const member = this.getMemberByUserId(userId);
      if (member) {
        this.seats[member.seatIndex] = null;
        if (userId === this.ownerId) {
          this.handoverHost();
        }
        this.broadcast();
      }
      return { success: true };
    }

    const member = this.getMemberByUserId(userId);
    if (!member) return { success: false, error: 'Bạn chưa ngồi ghế nào' };

    this.seats[member.seatIndex] = null;

    // Host handover if host left
    if (userId === this.ownerId) {
      this.handoverHost();
    }

    this.broadcast();
    return { success: true };
  }

  public toggleReady(userId: string): { success: boolean; error?: string } {
    if (this.activeGame && this.activeGame.phase === 'playing') {
      return { success: false, error: 'Ván bài đang diễn ra' };
    }

    const member = this.getMemberByUserId(userId);
    if (!member) return { success: false, error: 'Bạn phải ngồi vào ghế để sẵn sàng' };

    member.isReady = !member.isReady;
    this.broadcast();
    return { success: true };
  }

  public scheduleAutoStartNextGame(delayMs: number = 3000): void {
    this.clearAutoStartNextGame();
    this.nextGameAutoStartTime = Date.now() + delayMs;

    this.nextGameAutoStartTimer = setTimeout(() => {
      this.nextGameAutoStartTimer = null;
      this.nextGameAutoStartTime = null;

      const seated = this.seats.filter((s): s is RoomMember => s !== null && s.isOnline);
      if (seated.length >= 2) {
        this.startNextRound();
      } else {
        this.activeGame = null;
        for (const s of this.seats) {
          if (s) s.isReady = s.userId === this.ownerId;
        }
        this.broadcast();
      }
    }, delayMs);
  }

  public clearAutoStartNextGame(): void {
    if (this.nextGameAutoStartTimer) {
      clearTimeout(this.nextGameAutoStartTimer);
      this.nextGameAutoStartTimer = null;
      this.nextGameAutoStartTime = null;
    }
  }

  public startNextRound(): { success: boolean; error?: string } {
    this.clearAutoStartNextGame();

    const seated = this.seats.filter((s): s is RoomMember => s !== null && s.isOnline);
    if (seated.length < 2) {
      this.activeGame = null;
      this.broadcast();
      return { success: false, error: 'Cần ít nhất 2 người chơi online để bắt đầu' };
    }

    for (const s of this.seats) {
      if (s) {
        s.isReady = true;
      }
    }

    this.gameCount++;
    const isFirstGame = false;

    const gameId = `${this.code}-game-${this.gameCount}-${Date.now()}`;
    this.activeGame = new GameInstance({
      id: gameId,
      roomId: this.id,
      mode: this.mode,
      betAmount: this.betAmount,
      players: seated.map(s => ({
        id: s.userId,
        username: s.username,
        displayName: s.displayName,
        seatIndex: s.seatIndex,
        balance: s.balance,
      })),
      firstGame: isFirstGame,
      previousWinnerId: this.previousWinnerId,
      onStateChange: () => {
        if (this.activeGame && this.activeGame.phase === 'ended' && this.activeGame.finalResult) {
          if (this.activeGame.finalResult.winners.length === 1) {
            this.previousWinnerId = this.activeGame.finalResult.winners[0];
          } else {
            this.previousWinnerId = null;
          }
          // Sync seated member balances with DB
          for (const s of this.seats) {
            if (s) {
              db.getUserById(s.userId).then(u => {
                if (u && s) s.balance = u.balance;
              }).catch(() => {});
            }
          }
          this.scheduleAutoStartNextGame(3000);
        }
        this.broadcast();
      },
      onAutoKickOfflinePlayer: (playerId: string, reason: string) => {
        this.kickPlayer('system', playerId, reason);
      },
    });

    this.activeGame.start();
    this.broadcast();
    return { success: true };
  }

  public startGame(userId: string): { success: boolean; error?: string } {
    if (userId !== this.ownerId) {
      return { success: false, error: 'Chỉ có chủ phòng mới được bắt đầu ván bài' };
    }

    if (this.activeGame && this.activeGame.phase === 'playing') {
      return { success: false, error: 'Ván bài đang diễn ra' };
    }

    const seated = this.seats.filter((s): s is RoomMember => s !== null && s.isOnline);
    if (seated.length < 2 || seated.length > 4) {
      return { success: false, error: 'Cần từ 2 đến 4 người chơi để bắt đầu' };
    }

    // Check all ready
    const allReady = seated.every(s => s.isReady || s.userId === this.ownerId);
    if (!allReady) {
      return { success: false, error: 'Tất cả người chơi phải sẵn sàng' };
    }

    this.gameCount++;
    const isFirstGame = this.gameCount === 1;

    const gameId = `${this.code}-game-${this.gameCount}-${Date.now()}`;
    this.activeGame = new GameInstance({
      id: gameId,
      roomId: this.id,
      mode: this.mode,
      betAmount: this.betAmount,
      players: seated.map(s => ({
        id: s.userId,
        username: s.username,
        displayName: s.displayName,
        seatIndex: s.seatIndex,
        balance: s.balance,
      })),
      firstGame: isFirstGame,
      previousWinnerId: this.previousWinnerId,
      onStateChange: () => {
        if (this.activeGame && this.activeGame.phase === 'ended' && this.activeGame.finalResult) {
          if (this.activeGame.finalResult.winners.length === 1) {
            this.previousWinnerId = this.activeGame.finalResult.winners[0];
          } else {
            this.previousWinnerId = null;
          }
          // Sync seated member balances with DB
          for (const s of this.seats) {
            if (s) {
              db.getUserById(s.userId).then(u => {
                if (u && s) s.balance = u.balance;
              }).catch(() => {});
            }
          }
          this.scheduleAutoStartNextGame(3000);
        }
        this.broadcast();
      },
      onAutoKickOfflinePlayer: (playerId: string, reason: string) => {
        this.kickPlayer('system', playerId, reason);
      },
    });

    this.activeGame.start();
    this.broadcast();
    return { success: true };
  }

  public nextGame(userId: string): { success: boolean; error?: string } {
    this.clearAutoStartNextGame();

    const seated = this.seats.filter((s): s is RoomMember => s !== null && s.isOnline);
    if (seated.length >= 2) {
      return this.startNextRound();
    }

    // Reset ready states for next game
    for (const s of this.seats) {
      if (s) {
        s.isReady = s.userId === this.ownerId;
      }
    }
    this.activeGame = null;
    this.broadcast();
    return { success: true };
  }

  public async kickPlayer(
    requestUserId: string,
    targetUserId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (requestUserId !== 'system' && requestUserId !== this.ownerId) {
      return { success: false, error: 'Chỉ có chủ phòng mới có quyền kick người chơi' };
    }

    if (targetUserId === this.ownerId && requestUserId !== 'system') {
      return { success: false, error: 'Không thể tự kick chính mình' };
    }

    const member = this.getMemberByUserId(targetUserId);
    if (!member) {
      return { success: false, error: 'Người chơi không có trong phòng' };
    }

    const displayName = member.displayName;

    // Clear any disconnect timer
    if (this.disconnectTimers.has(targetUserId)) {
      clearTimeout(this.disconnectTimers.get(targetUserId)!);
      this.disconnectTimers.delete(targetUserId);
    }

    // 1. If game is active, remove player from game
    if (this.activeGame && this.activeGame.phase === 'playing') {
      await this.activeGame.removePlayer(targetUserId, reason || 'Lỗi không xác định');
    }

    // 2. Clear seat
    this.seats[member.seatIndex] = null;

    // Handover host if host was kicked by system
    if (targetUserId === this.ownerId) {
      this.handoverHost();
    }

    // 3. Add table notice
    if (this.activeGame) {
      this.activeGame.chopNotices.push({
        text: `🚫 ${displayName} đã bị kick khỏi phòng`,
        createdAt: Date.now(),
      });
    }

    this.broadcast();
    return { success: true };
  }

  public handleDisconnect(userId: string, socketId: string): void {
    const member = this.getMemberByUserId(userId);
    if (member && member.socketId === socketId) {
      member.isOnline = false;
      member.socketId = null;
      member.offlineSince = Date.now();

      if (this.activeGame && this.activeGame.phase === 'playing') {
        this.activeGame.setPlayerOnline(userId, false);
      } else {
        // If in lobby and owner disconnected, handover host
        if (userId === this.ownerId) {
          this.handoverHost();
        }
      }

      // Schedule auto-kick after 3 minutes (180,000 ms) of being offline
      if (this.disconnectTimers.has(userId)) {
        clearTimeout(this.disconnectTimers.get(userId)!);
      }
      const timer = setTimeout(async () => {
        this.disconnectTimers.delete(userId);
        const m = this.getMemberByUserId(userId);
        if (m && !m.isOnline) {
          await this.kickPlayer('system', userId, `${m.displayName} bị out quá 3 phút và bị kick khỏi phòng`);
        }
      }, 3 * 60 * 1000);
      this.disconnectTimers.set(userId, timer);

      this.broadcast();
    }
  }

  private handoverHost(): void {
    const nextMember = this.seats.find(s => s && s.isOnline && s.userId !== this.ownerId);
    if (nextMember) {
      this.ownerId = nextMember.userId;
      nextMember.isReady = true;
    }
  }

  public broadcast(): void {
    this.broadcastFn(this);
  }

  public getClientView(userId: string): RoomClientView {
    const myMember = this.getMemberByUserId(userId);
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      mode: this.mode,
      betAmount: this.betAmount,
      hasPassword: !!this.passwordHash,
      maxPlayers: this.maxPlayers,
      ownerId: this.ownerId,
      isGameActive: !!(this.activeGame && this.activeGame.phase === 'playing'),
      mySeatIndex: myMember ? myMember.seatIndex : -1,
      seats: this.seats,
      nextGameAutoStartTime: this.nextGameAutoStartTime,
      gameState: this.activeGame ? this.activeGame.getClientView(userId) : undefined,
      recentChats: this.recentChats,
    };
  }

  public addChatMessage(
    sender: { id: string; displayName: string },
    text: string,
    isSystem = false
  ): RoomChatMessage | null {
    const cleanText = text.trim().slice(0, 200);
    if (!cleanText) return null;

    const member = this.getMemberByUserId(sender.id);
    const seatIdx = member ? member.seatIndex : -1;

    const msg: RoomChatMessage = {
      id: `${this.id}-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: sender.id,
      senderName: sender.displayName,
      senderSeatIndex: seatIdx,
      text: cleanText,
      createdAt: Date.now(),
      isSystem,
    };

    this.recentChats.push(msg);
    if (this.recentChats.length > 50) {
      this.recentChats.shift();
    }
    return msg;
  }
}

export class RoomManager {
  private roomsByCode = new Map<string, Room>();
  private roomsById = new Map<string, Room>();
  private broadcastRoomCallback: (room: Room) => void = () => {};

  public setBroadcastCallback(cb: (room: Room) => void) {
    this.broadcastRoomCallback = cb;
  }

  public generateRoomCode(): string {
    return crypto.randomBytes(4).toString('hex').toLowerCase(); // 8 lowercase characters
  }

  public async createRoom(params: {
    name: string;
    mode: GameMode;
    password?: string;
    maxPlayers?: number;
    betAmount?: number;
    owner: { id: string; username: string; displayName: string };
  }): Promise<Room> {
    const code = this.generateRoomCode();
    const id = `room_${code}_${Date.now()}`;
    const passwordHash = params.password ? await hashPassword(params.password) : null;
    const maxPlayers = params.maxPlayers || 4;
    const betAmount = params.betAmount && params.betAmount >= 10 && params.betAmount % 10 === 0 ? params.betAmount : 10;

    const roomRow = await db.createRoom({
      id,
      code,
      name: params.name,
      mode: params.mode,
      password_hash: passwordHash,
      max_players: maxPlayers,
      bet_amount: betAmount,
      owner_id: params.owner.id,
    });

    const room = new Room({
      id,
      code,
      name: params.name,
      mode: params.mode,
      betAmount,
      passwordHash,
      maxPlayers,
      ownerId: params.owner.id,
      broadcastFn: r => this.broadcastRoomCallback(r),
    });

    this.roomsByCode.set(code, room);
    this.roomsById.set(id, room);

    return room;
  }

  public async getOrLoadRoomByCode(code: string): Promise<Room | null> {
    const existing = this.roomsByCode.get(code);
    if (existing) return existing;

    const row = await db.getRoomByCode(code);
    if (!row) return null;

    const room = new Room({
      id: row.id,
      code: row.code,
      name: row.name,
      mode: row.mode as GameMode,
      betAmount: row.bet_amount || 10,
      passwordHash: row.password_hash,
      maxPlayers: row.max_players,
      ownerId: row.owner_id,
      broadcastFn: r => this.broadcastRoomCallback(r),
    });

    this.roomsByCode.set(code, room);
    this.roomsById.set(row.id, room);
    return room;
  }

  public findRoomBySocketId(socketId: string): { room: Room; member: RoomMember } | null {
    for (const room of this.roomsByCode.values()) {
      for (const seat of room.seats) {
        if (seat && seat.socketId === socketId) {
          return { room, member: seat };
        }
      }
    }
    return null;
  }

  public listPublicRooms(): {
    code: string;
    name: string;
    mode: GameMode;
    maxPlayers: number;
    betAmount: number;
    playerCount: number;
    hasPassword: boolean;
    isGameActive: boolean;
  }[] {
    const list = [];
    for (const room of this.roomsByCode.values()) {
      const playerCount = room.seats.filter(s => s !== null).length;
      list.push({
        code: room.code,
        name: room.name,
        mode: room.mode,
        maxPlayers: room.maxPlayers,
        betAmount: room.betAmount,
        playerCount,
        hasPassword: !!room.passwordHash,
        isGameActive: !!(room.activeGame && room.activeGame.phase === 'playing'),
      });
    }
    return list;
  }

  public findOpenRoom(mode?: GameMode, maxPlayers?: number): Room | null {
    for (const room of this.roomsByCode.values()) {
      if (room.passwordHash) continue;
      if (room.activeGame && room.activeGame.phase === 'playing') continue;
      if (mode && room.mode !== mode) continue;
      if (maxPlayers && room.maxPlayers !== maxPlayers) continue;
      const playerCount = room.seats.filter(s => s !== null).length;
      if (playerCount < room.maxPlayers) {
        return room;
      }
    }
    return null;
  }
}

export const roomManager = new RoomManager();
