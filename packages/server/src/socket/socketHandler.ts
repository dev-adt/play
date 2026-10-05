import { Server, Socket } from 'socket.io';
import { authenticateSocketToken } from '../auth/auth.js';
import { roomManager, Room } from '../rooms/RoomManager.js';
import { comparePassword } from '../auth/auth.js';

export function setupSocketServer(io: Server) {
  // Set up room broadcast callback
  roomManager.setBroadcastCallback((room: Room) => {
    const roomChannel = `room:${room.code}`;
    const socketsInRoom = io.sockets.adapter.rooms.get(roomChannel);

    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        const clientSocket = io.sockets.sockets.get(socketId);
        if (clientSocket && clientSocket.data.user) {
          const clientView = room.getClientView(clientSocket.data.user.userId);
          clientSocket.emit('room_state', clientView);
        }
      }
    }
  });

  // Socket middleware for authentication
  io.use((socket: Socket, next: (err?: Error) => void) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.cookie as string | undefined)
        ?.split('; ')
        .find((row: string) => row.startsWith('token='))
        ?.split('=')[1];

    const user = authenticateSocketToken(token);
    if (!user) {
      return next(new Error('Chưa đăng nhập hoặc phiên làm việc đã hết hạn'));
    }

    socket.data.user = user;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    // Join room
    socket.on('join_room', async (data: { roomCode: string; password?: string }, callback?: (res: any) => void) => {
      try {
        const room = await roomManager.getOrLoadRoomByCode(data.roomCode);
        if (!room) {
          if (callback) callback({ success: false, error: 'Không tìm thấy phòng chơi này' });
          return;
        }

        // Verify room password if set
        if (room.passwordHash) {
          if (!data.password) {
            if (callback) callback({ success: false, error: 'Phòng yêu cầu mật khẩu', needPassword: true });
            return;
          }
          const validPass = await comparePassword(data.password, room.passwordHash);
          if (!validPass) {
            if (callback) callback({ success: false, error: 'Mật khẩu phòng không đúng' });
            return;
          }
        }

        const roomChannel = `room:${room.code}`;
        await socket.join(roomChannel);

        // Check if user is already seated (reconnect flow)
        const member = room.getMemberByUserId(user.userId);
        if (member) {
          member.isOnline = true;
          member.socketId = socket.id;
          if (room.activeGame) {
            room.activeGame.setPlayerOnline(user.userId, true);
          }
        }

        room.broadcast();
        if (callback) callback({ success: true, room: room.getClientView(user.userId) });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message || 'Lỗi khi vào phòng' });
      }
    });

    // Take seat
    socket.on('take_seat', async (data: { roomCode: string; seatIndex: number }, callback?: (res: any) => void) => {
      const room = await roomManager.getOrLoadRoomByCode(data.roomCode);
      if (!room) {
        if (callback) callback({ success: false, error: 'Phòng không tồn tại' });
        return;
      }

      const res = room.takeSeat(
        { id: user.userId, username: user.username, displayName: user.displayName },
        data.seatIndex,
        socket.id
      );

      if (callback) callback(res);
    });

    // Leave seat
    socket.on('leave_seat', async (data: { roomCode: string }, callback?: (res: any) => void) => {
      const room = await roomManager.getOrLoadRoomByCode(data.roomCode);
      if (!room) {
        if (callback) callback({ success: false, error: 'Phòng không tồn tại' });
        return;
      }

      const res = room.leaveSeat(user.userId);
      if (callback) callback(res);
    });

    // Toggle ready
    socket.on('toggle_ready', async (data: { roomCode: string }, callback?: (res: any) => void) => {
      const room = await roomManager.getOrLoadRoomByCode(data.roomCode);
      if (!room) {
        if (callback) callback({ success: false, error: 'Phòng không tồn tại' });
        return;
      }

      const res = room.toggleReady(user.userId);
      if (callback) callback(res);
    });

    // Start game
    socket.on('start_game', async (data: { roomCode: string }, callback?: (res: any) => void) => {
      const room = await roomManager.getOrLoadRoomByCode(data.roomCode);
      if (!room) {
        if (callback) callback({ success: false, error: 'Phòng không tồn tại' });
        return;
      }

      const res = room.startGame(user.userId);
      if (callback) callback(res);
    });

    // Play cards
    socket.on(
      'play_cards',
      async (data: { roomCode: string; cardIds: string[]; expectedStateVersion?: number }, callback?: (res: any) => void) => {
        const room = await roomManager.getOrLoadRoomByCode(data.roomCode);
        if (!room || !room.activeGame) {
          if (callback) callback({ success: false, error: 'Không có ván bài nào đang chạy' });
          return;
        }

        const res = await room.activeGame.playCards(user.userId, data.cardIds);
        if (callback) callback(res);
      }
    );

    // Pass turn
    socket.on('pass_turn', async (data: { roomCode: string; expectedStateVersion?: number }, callback?: (res: any) => void) => {
      const room = await roomManager.getOrLoadRoomByCode(data.roomCode);
      if (!room || !room.activeGame) {
        if (callback) callback({ success: false, error: 'Không có ván bài nào đang chạy' });
        return;
      }

      const res = await room.activeGame.passTurn(user.userId);
      if (callback) callback(res);
    });

    // Next game (return to lobby or start next round immediately)
    socket.on('next_game', async (data: { roomCode: string }, callback?: (res: any) => void) => {
      const room = await roomManager.getOrLoadRoomByCode(data.roomCode);
      if (!room) {
        if (callback) callback({ success: false, error: 'Phòng không tồn tại' });
        return;
      }

      const res = room.nextGame(user.userId);
      if (callback) callback(res);
    });

    // Kick player
    socket.on('kick_player', async (data: { roomCode: string; targetUserId: string }, callback?: (res: any) => void) => {
      const room = await roomManager.getOrLoadRoomByCode(data.roomCode);
      if (!room) {
        if (callback) callback({ success: false, error: 'Phòng không tồn tại' });
        return;
      }

      const targetMember = room.getMemberByUserId(data.targetUserId);
      const targetSocketId = targetMember?.socketId;

      const res = await room.kickPlayer(user.userId, data.targetUserId);
      if (res.success && targetSocketId) {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.emit('kicked_from_room', { reason: 'Bạn đã bị chủ phòng mời ra khỏi phòng' });
          targetSocket.leave(`room:${room.code}`);
        }
      }

      if (callback) callback(res);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const found = roomManager.findRoomBySocketId(socket.id);
      if (found) {
        found.room.handleDisconnect(found.member.userId, socket.id);
      }
    });
  });
}
