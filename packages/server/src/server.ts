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
      });

      const tokenPayload = {
        userId: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
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
      const user = {
        ...req.user!,
        isAdmin: req.user!.username.toLowerCase() === 'admin',
      };
      const stats = await db.getPlayerStats(user.userId);
      res.json({ user, stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
      const { name, mode, password, maxPlayers } = req.body;
      const roomName = name && typeof name === 'string' && name.trim().length > 0 ? name.trim() : `Bàn của ${req.user!.displayName}`;
      const gameMode = mode === 'fund' ? 'fund' : 'basic';
      const maxP = maxPlayers && maxPlayers >= 2 && maxPlayers <= 4 ? parseInt(maxPlayers, 10) : 4;

      const room = await roomManager.createRoom({
        name: roomName,
        mode: gameMode,
        password: password ? String(password) : undefined,
        maxPlayers: maxP,
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
