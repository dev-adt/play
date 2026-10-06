import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import crypto from 'crypto';
import { config } from './config.js';
import { db } from './db/database.js';
import {
  authenticate,
  AuthenticatedRequest,
  comparePassword,
  generateToken,
  hashPassword,
} from './auth/auth.js';
import { roomManager } from './rooms/RoomManager.js';
import { setupSocketServer } from './socket/socketHandler.js';
import { defaultRulesConfig } from '@tienlen/shared';

export function createServer() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: [config.appOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });

  // Middleware
  app.use(
    cors({
      origin: [config.appOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.user || req.user.username.toLowerCase() !== 'admin') {
      res.status(403).json({ error: 'Quyền truy cập bị từ chối: Yêu cầu quyền Quản Trị Viên (Admin).' });
      return;
    }
    next();
  }

  // --- AUTH ROUTES ---
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { username, password, displayName } = req.body;
      if (!username || typeof username !== 'string' || username.trim().length < 3) {
        res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
        return;
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
        return;
      }
      const dName = displayName && typeof displayName === 'string' ? displayName.trim() : username.trim();

      const existing = await db.getUserByUsername(username);
      if (existing) {
        res.status(400).json({ error: 'Tên đăng nhập này đã được sử dụng' });
        return;
      }

      const passwordHash = await hashPassword(password);
      const userId = `u_${crypto.randomBytes(8).toString('hex')}`;
      const newUser = await db.createUser({
        id: userId,
        username: username.trim(),
        password_hash: passwordHash,
        display_name: dName,
      });

      const isAdmin = newUser.username.toLowerCase() === 'admin';
      const tokenPayload = {
        userId: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        balance: newUser.balance,
        isAdmin,
      };
      const token = generateToken(tokenPayload);

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const stats = await db.getPlayerStats(newUser.id);

      res.status(201).json({
        user: tokenPayload,
        token,
        stats,
      });
    } catch (err: any) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Đăng ký thất bại, vui lòng thử lại sau' });
    }
  });

  // Guest Quick Play Auth
  app.post('/api/auth/guest', async (req: Request, res: Response) => {
    try {
      const guestNum = Math.floor(1000 + Math.random() * 9000);
      const username = `guest_${Date.now() % 1000000}_${guestNum}`;
      const displayName = req.body.displayName?.trim() || `Khách ${guestNum}`;
      const dummyPassword = crypto.randomUUID();
      const passwordHash = await hashPassword(dummyPassword);
      const userId = `u_${crypto.randomBytes(8).toString('hex')}`;

      const newUser = await db.createUser({
        id: userId,
        username,
        display_name: displayName,
        password_hash: passwordHash,
        balance: 1000, // Guest account given 1000$ by default
      });

      const tokenPayload = {
        userId: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        balance: newUser.balance,
        isAdmin: false,
      };
      const token = generateToken(tokenPayload);

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const stats = await db.getPlayerStats(newUser.id);
      res.status(201).json({
        user: tokenPayload,
        token,
        stats,
      });
    } catch (err: any) {
      console.error('Guest auth error:', err);
      res.status(500).json({ error: 'Không thể tạo phiên khách' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu' });
        return;
      }

      const user = await db.getUserByUsername(username);
      if (!user) {
        res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
        return;
      }

      const valid = await comparePassword(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
        return;
      }

      const isAdmin = user.username.toLowerCase() === 'admin';
      const tokenPayload = {
        userId: user.id,
        username: user.username,
        displayName: user.display_name,
        balance: user.balance !== undefined ? user.balance : 1000,
        isAdmin,
      };
      const token = generateToken(tokenPayload);

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const stats = await db.getPlayerStats(user.id);

      res.json({
        user: tokenPayload,
        token,
        stats,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Đăng nhập thất bại, vui lòng thử lại' });
    }
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dbUser = await db.getUserById(req.user!.userId);
      const user = {
        ...req.user!,
        balance: dbUser?.balance !== undefined ? dbUser.balance : 1000,
        isAdmin: req.user!.username.toLowerCase() === 'admin',
      };
      const stats = await db.getPlayerStats(user.userId);
      res.json({ user, stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- DAILY LOGIN REWARD ROUTES ---
  app.get('/api/daily-reward/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = await db.getDailyRewardStatus(req.user!.userId);
      res.json({ status });
    } catch (err: any) {
      console.error('Daily reward status error:', err);
      res.status(500).json({ error: 'Không thể tải thông tin quà đăng nhập' });
    }
  });

  app.post('/api/daily-reward/claim', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await db.claimDailyReward(req.user!.userId);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({
        ...result,
        rewardAmount: result.claimedAmount,
        currentStreak: result.newStreak,
      });
    } catch (err: any) {
      console.error('Daily reward claim error:', err);
      res.status(500).json({ error: 'Không thể nhận quà đăng nhập' });
    }
  });

  // --- ADMIN ROUTES ---
  app.get('/api/admin/users', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await db.getAllUsersWithStats();
      res.json({ users });
    } catch (err: any) {
      console.error('Admin get users error:', err);
      res.status(500).json({ error: 'Không thể tải danh sách tài khoản' });
    }
  });

  app.get('/api/admin/users/:userId/history', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      if (!targetUserId) {
        res.status(400).json({ error: 'Thiếu mã người dùng' });
        return;
      }
      const targetUser = await db.getUserById(targetUserId);
      if (!targetUser) {
        res.status(404).json({ error: 'Không tìm thấy người chơi' });
        return;
      }
      const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
      const history = await db.getPlayerGameHistory(targetUserId, limit, mode);
      const stats = await db.getPlayerStats(targetUserId);
      res.json({
        user: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.display_name,
          createdAt: targetUser.created_at,
          isGuest: targetUser.username.startsWith('guest_'),
          isAdmin: targetUser.username.toLowerCase() === 'admin',
        },
        history,
        stats,
      });
    } catch (err: any) {
      console.error('Admin get user history error:', err);
      res.status(500).json({ error: 'Không thể tải lịch sử đấu của tài khoản' });
    }
  });

  // Public summary for in-game player inspection
  app.get('/api/users/:userId/summary', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      if (!targetUserId) {
        res.status(400).json({ error: 'Thiếu mã người dùng' });
        return;
      }
      const targetUser = await db.getUserById(targetUserId);
      if (!targetUser) {
        res.status(404).json({ error: 'Không tìm thấy người chơi' });
        return;
      }
      const history = await db.getPlayerGameHistory(targetUserId, 15);
      const stats = await db.getPlayerStats(targetUserId);
      res.json({
        user: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.display_name,
          balance: targetUser.balance !== undefined ? targetUser.balance : 1000,
        },
        stats,
        history,
      });
    } catch (err: any) {
      console.error('Get user summary error:', err);
      res.status(500).json({ error: 'Không thể tải thông tin người chơi' });
    }
  });

  app.post('/api/admin/users/:userId/adjust-balance', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const { action, amount } = req.body;
      const numAmount = Math.floor(Number(amount));
      if (isNaN(numAmount) || numAmount < 0) {
        res.status(400).json({ error: 'Số tiền phải là số nguyên dương hợp lệ' });
        return;
      }
      const targetUser = await db.getUserById(targetUserId);
      if (!targetUser) {
        res.status(404).json({ error: 'Không tìm thấy người chơi' });
        return;
      }

      let newBalance = targetUser.balance !== undefined ? targetUser.balance : 1000;
      if (action === 'add') {
        newBalance = await db.updateUserBalance(targetUserId, numAmount);
      } else if (action === 'subtract') {
        newBalance = await db.updateUserBalance(targetUserId, -numAmount);
      } else if (action === 'set') {
        newBalance = await db.setUserBalance(targetUserId, numAmount);
      } else {
        res.status(400).json({ error: 'Hành động không hợp lệ (hỗ trợ: add, subtract, set)' });
        return;
      }

      res.json({
        success: true,
        userId: targetUserId,
        username: targetUser.username,
        balance: newBalance,
        message: `Cập nhật số dư thành công: ${newBalance.toLocaleString()}$`,
      });
    } catch (err: any) {
      console.error('Admin adjust balance error:', err);
      res.status(500).json({ error: 'Không thể điều chỉnh số dư của tài khoản' });
    }
  });

  // --- WISHES & FEEDBACK ROUTES ---
  app.post('/api/feedback/submit', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, title, content } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length < 5) {
        res.status(400).json({ error: 'Nội dung lời chúc hoặc góp ý phải có ít nhất 5 ký tự' });
        return;
      }
      const validTypes = ['wish', 'feedback', 'bug'];
      const wishType = validTypes.includes(type) ? type : 'wish';
      const id = `fw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const feedback = await db.createFeedbackWish({
        id,
        userId: req.user!.userId,
        type: wishType,
        title: title ? String(title).slice(0, 100) : undefined,
        content: content.trim(),
      });

      res.status(201).json({
        success: true,
        feedback,
        message: 'Gửi lời chúc/góp ý thành công! Admin sẽ sớm đọc và gửi quà thưởng cho bạn nhé 🎉',
      });
    } catch (err: any) {
      console.error('Submit feedback error:', err);
      res.status(500).json({ error: 'Không thể gửi lời chúc/góp ý lúc này' });
    }
  });

  app.get('/api/feedback/my', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const wishes = await db.getMyFeedbackWishes(req.user!.userId);
      res.json({ success: true, wishes });
    } catch (err: any) {
      console.error('Get my feedback error:', err);
      res.status(500).json({ error: 'Không thể tải lịch sử lời chúc' });
    }
  });

  app.get('/api/admin/feedback', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const wishes = await db.getAllFeedbackWishes(status);
      res.json({ success: true, wishes });
    } catch (err: any) {
      console.error('Admin get feedback error:', err);
      res.status(500).json({ error: 'Không thể tải danh sách lời chúc/góp ý' });
    }
  });

  app.post('/api/admin/feedback/:id/reward', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const feedbackId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { rewardAmount, adminNote } = req.body;
      const amount = Math.floor(Number(rewardAmount));
      if (isNaN(amount) || amount <= 0) {
        res.status(400).json({ error: 'Số tiền thưởng phải lớn hơn 0$' });
        return;
      }

      const result = await db.rewardFeedbackWish({
        feedbackId,
        rewardAmount: amount,
        adminNote: adminNote ? String(adminNote).trim() : undefined,
      });

      res.json({
        success: true,
        message: `Đã thưởng +${amount.toLocaleString()}$ cho người chơi thành công!`,
        newBalance: result.newBalance,
        feedback: result.feedback,
      });
    } catch (err: any) {
      console.error('Admin reward feedback error:', err);
      res.status(500).json({ error: err.message || 'Không thể duyệt thưởng' });
    }
  });


  // --- STATS & HISTORY ---
  app.get('/api/history', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 30;
      const history = await db.getPlayerGameHistory(req.user!.userId, limit, mode);
      const stats = await db.getPlayerStats(req.user!.userId);
      res.json({ history, stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/rules-config', (_req: Request, res: Response) => {
    res.json({ config: defaultRulesConfig });
  });

  // --- ROOMS API ---
  app.post('/api/rooms/create', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, mode, password, maxPlayers, betAmount } = req.body;
      const roomName = name && typeof name === 'string' && name.trim().length > 0 ? name.trim() : `Bàn của ${req.user!.displayName}`;
      const gameMode = mode === 'fund' ? 'fund' : 'basic';
      const maxP = maxPlayers && maxPlayers >= 2 && maxPlayers <= 4 ? parseInt(maxPlayers, 10) : 4;
      if (betAmount !== undefined && betAmount !== null && betAmount !== '') {
        const parsedBet = parseInt(String(betAmount), 10);
        if (isNaN(parsedBet) || parsedBet < 10 || parsedBet % 10 !== 0) {
          res.status(400).json({ error: 'Mức cược phải là bội số của 10 và tối thiểu là 10$' });
          return;
        }
      }
      const validBet = betAmount ? parseInt(String(betAmount), 10) : 10;

      const room = await roomManager.createRoom({
        name: roomName,
        mode: gameMode,
        password: password ? String(password) : undefined,
        maxPlayers: maxP,
        betAmount: validBet,
        owner: {
          id: req.user!.userId,
          username: req.user!.username,
          displayName: req.user!.displayName,
        },
      });

      res.status(201).json({
        room: {
          id: room.id,
          code: room.code,
          name: room.name,
          mode: room.mode,
          betAmount: room.betAmount,
          hasPassword: !!room.passwordHash,
          maxPlayers: room.maxPlayers,
          link: `/room/${room.code}`,
          fullUrl: `${config.appOrigin}/room/${room.code}`,
        },
      });
    } catch (err: any) {
      console.error('Create room error:', err);
      res.status(500).json({ error: 'Không thể tạo phòng, vui lòng thử lại' });
    }
  });

  app.get('/api/rooms', async (_req: Request, res: Response) => {
    try {
      const rooms = roomManager.listPublicRooms();
      res.json({ rooms });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/rooms/quick-join', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mode, maxPlayers } = req.body;
      const gameMode = mode === 'fund' ? 'fund' : 'basic';
      const maxP = maxPlayers && maxPlayers >= 2 && maxPlayers <= 4 ? parseInt(maxPlayers, 10) : undefined;

      // 1. Try to find open room
      const openRoom = roomManager.findOpenRoom(gameMode, maxP);
      if (openRoom) {
        res.json({
          room: {
            id: openRoom.id,
            code: openRoom.code,
            name: openRoom.name,
            mode: openRoom.mode,
            betAmount: openRoom.betAmount,
            maxPlayers: openRoom.maxPlayers,
            hasPassword: false,
          },
        });
        return;
      }

      // 2. Otherwise auto-create a quick match room
      const newRoom = await roomManager.createRoom({
        name: `Bàn Chơi Nhanh #${Math.floor(100 + Math.random() * 900)}`,
        mode: gameMode,
        maxPlayers: maxP || 4,
        betAmount: 10,
        owner: {
          id: req.user!.userId,
          username: req.user!.username,
          displayName: req.user!.displayName,
        },
      });

      res.json({
        room: {
          id: newRoom.id,
          code: newRoom.code,
          name: newRoom.name,
          mode: newRoom.mode,
          betAmount: newRoom.betAmount,
          maxPlayers: newRoom.maxPlayers,
          hasPassword: false,
        },
      });
    } catch (err: any) {
      console.error('Quick join error:', err);
      res.status(500).json({ error: 'Không thể vào phòng nhanh, vui lòng thử lại' });
    }
  });

  app.get('/api/rooms/:code', async (req: Request, res: Response) => {
    try {
      const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
      const room = await roomManager.getOrLoadRoomByCode(code);
      if (!room) {
        res.status(404).json({ error: 'Không tìm thấy phòng chơi' });
        return;
      }

      res.json({
        room: {
          id: room.id,
          code: room.code,
          name: room.name,
          mode: room.mode,
          betAmount: room.betAmount,
          hasPassword: !!room.passwordHash,
          maxPlayers: room.maxPlayers,
          isGameActive: !!(room.activeGame && room.activeGame.phase === 'playing'),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- HEALTH CHECK ---
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      service: 'tienlen-server',
      domain: config.appOrigin,
      databaseType: db.dbType,
      isMysql: db.dbType === 'mysql',
    });
  });

  // --- PRODUCTION STATIC CLIENT HOSTING ---
  const clientDist = path.resolve(config.clientDistPath);
  if (fs.existsSync(clientDist)) {
    console.log(`Serving frontend static files from: ${clientDist}`);
    app.use(express.static(clientDist));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Setup Socket.IO
  setupSocketServer(io);

  return { app, server, io };
}
