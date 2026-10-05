import crypto from 'crypto';
import { GameMode } from '@tienlen/shared';
import { db, RoomRow } from '../db/database.js';
import { GameInstance, GameStateClientView } from '../game/GameInstance.js';
import { comparePassword, hashPassword } from '../auth/auth.js';

export interface RoomMember {
  userId: string;
  username: string;
  displayName: string;
  seatIndex: number;
  isReady: boolean;
  isOnline: boolean;
  socketId: string | null;
}

export interface RoomClientView {
  id: string;
  code: string;
  name: string;
  mode: GameMode;
  hasPassword: boolean;
  maxPlayers: number;
  ownerId: string;
  isGameActive: boolean;
  mySeatIndex: number;
  seats: (RoomMember | null)[];
  gameState?: GameStateClientView;
}

export class Room {
  public id: string;
  public code: string;
  public name: string;
  public mode: GameMode;
  public passwordHash: string | null;
  public maxPlayers: number;
  public ownerId: string;
  public seats: (RoomMember | null)[] = [null, null, null, null];
  public activeGame: GameInstance | null = null;
  public gameCount: number = 0;
  public previousWinnerId: string | null = null;

  private broadcastFn: (room: Room) => void;

  constructor(options: {
    id: string;
    code: string;
    name: string;
    mode: GameMode;
    passwordHash: string | null;
    maxPlayers: number;
    ownerId: string;
    broadcastFn: (room: Room) => void;
  }) {
    this.id = options.id;
    this.code = options.code;
    this.name = options.name;
    this.mode = options.mode;
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
    user: { id: string; username: string; displayName: string },
    seatIndex: number,
    socketId: string
  ): { success: boolean; error?: string } {
    // If game is active, only reconnecting to own seat is allowed
    if (this.activeGame && this.activeGame.phase === 'playing') {
      const existing = this.getMemberByUserId(user.id);
      if (existing) {
        existing.isOnline = true;
        existing.socketId = socketId;
        this.activeGame.setPlayerOnline(user.id, true);
        this.broadcast();
        return { success: true };
      }
      return { success: false, error: 'Ván bài đang diễn ra, bạn vui lòng chờ ván sau để vào ghế!' };
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

    this.seats[seatIndex] = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      seatIndex,
      isReady: user.id === this.ownerId, // Room owner is ready by default
      isOnline: true,
      socketId,
    };

    this.broadcast();
    return { success: true };
  }

  public leaveSeat(userId: string): { success: boolean; error?: string } {
    if (this.activeGame && this.activeGame.phase === 'playing') {
      const member = this.getMemberByUserId(userId);
      if (member) {
        member.isOnline = false;
        member.socketId = null;
        this.activeGame.setPlayerOnline(userId, false);
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
      players: seated.map(s => ({
        id: s.userId,
        username: s.username,
        displayName: s.displayName,
        seatIndex: s.seatIndex,
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
        }
        this.broadcast();
      },
    });

    this.activeGame.start();
    this.broadcast();
    return { success: true };
  }

  public nextGame(userId: string): { success: boolean; error?: string } {
    if (!this.activeGame || this.activeGame.phase !== 'ended') {
      return { success: false, error: 'Ván bài chưa kết thúc' };
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

  public handleDisconnect(userId: string, socketId: string): void {
    const member = this.getMemberByUserId(userId);
    if (member && member.socketId === socketId) {
      member.isOnline = false;
      member.socketId = null;

      if (this.activeGame && this.activeGame.phase === 'playing') {
        this.activeGame.setPlayerOnline(userId, false);
      } else {
        // If in lobby and owner disconnected, handover host
        if (userId === this.ownerId) {
          this.handoverHost();
        }
      }
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
      hasPassword: !!this.passwordHash,
      maxPlayers: this.maxPlayers,
      ownerId: this.ownerId,
      isGameActive: !!(this.activeGame && this.activeGame.phase === 'playing'),
      mySeatIndex: myMember ? myMember.seatIndex : -1,
      seats: this.seats,
      gameState: this.activeGame ? this.activeGame.getClientView(userId) : undefined,
    };
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
    owner: { id: string; username: string; displayName: string };
  }): Promise<Room> {
    const code = this.generateRoomCode();
    const id = `room_${code}_${Date.now()}`;
    const passwordHash = params.password ? await hashPassword(params.password) : null;
    const maxPlayers = params.maxPlayers || 4;

    const roomRow = await db.createRoom({
      id,
      code,
      name: params.name,
      mode: params.mode,
      password_hash: passwordHash,
      max_players: maxPlayers,
      owner_id: params.owner.id,
    });

    const room = new Room({
      id,
      code,
      name: params.name,
      mode: params.mode,
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
