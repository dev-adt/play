import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../src/server.js';
import { db } from '../src/db/database.js';
import http from 'http';
import { io as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';

describe('Server & API Integration Tests', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    await db.init();
    const appInstance = createServer();
    server = appInstance.server;

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        port = addr.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/health returns 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('tienlen-server');
  });

  it('POST /api/auth/register creates user and returns token and stats', async () => {
    const username = `test_user_${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: 'password123',
        displayName: 'Người Chơi Thử',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.username).toBe(username);
    expect(data.user.displayName).toBe('Người Chơi Thử');
    expect(data.token).toBeDefined();
    expect(data.stats.basic.net_score).toBe(0);
    expect(data.stats.fund.total_negative).toBe(0);
  });

  it('POST /api/auth/login validates password and returns user info', async () => {
    const username = `test_login_${Date.now()}`;
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: 'password123',
        displayName: 'Anh Ba',
      }),
    });

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: 'password123',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.username).toBe(username);
    expect(data.token).toBeDefined();
  });

  it('POST /api/rooms/create creates room and returns link', async () => {
    const username = `host_${Date.now()}`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: 'password123',
        displayName: 'Chủ Bàn',
      }),
    });
    const regData = await regRes.json();
    const token = regData.token;

    const res = await fetch(`${baseUrl}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Bàn Vui Vẻ',
        mode: 'fund',
        maxPlayers: 4,
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.room.name).toBe('Bàn Vui Vẻ');
    expect(data.room.mode).toBe('fund');
    expect(data.room.code).toBeDefined();
    expect(data.room.link).toBe(`/room/${data.room.code}`);
  });

  it('Socket.IO connection and room lifecycle', async () => {
    // Register player
    const username = `socket_player_${Date.now()}`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: 'password123',
        displayName: 'Player Socket',
      }),
    });
    const { token, user } = await regRes.json();

    // Create room
    const roomRes = await fetch(`${baseUrl}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Bàn Test Socket',
        mode: 'basic',
      }),
    });
    const { room } = await roomRes.json();

    // Connect socket
    const socket = ClientSocket(baseUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        // Join room
        socket.emit(
          'join_room',
          { roomCode: room.code },
          (joinRes: any) => {
            expect(joinRes.success).toBe(true);

            // Take seat 0
            socket.emit(
              'take_seat',
              { roomCode: room.code, seatIndex: 0 },
              (seatRes: any) => {
                expect(seatRes.success).toBe(true);
                socket.disconnect();
                resolve();
              }
            );
          }
        );
      });
      socket.on('connect_error', (err) => reject(err));
    });
  });

  it('POST /api/auth/guest creates instant guest account', async () => {
    const res = await fetch(`${baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Khách VIP' }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.displayName).toBe('Khách VIP');
    expect(data.token).toBeDefined();
  });

  it('GET /api/rooms lists public rooms and supports quick-join', async () => {
    // 1. Guest creates a 2-player room
    const guestRes = await fetch(`${baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Player 2P' }),
    });
    const { token } = await guestRes.json();

    const createRes = await fetch(`${baseUrl}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Bàn Đôi 1v1',
        mode: 'basic',
        maxPlayers: 2,
      }),
    });
    const { room } = await createRes.json();
    expect(room.maxPlayers).toBe(2);

    // 2. GET /api/rooms should list it
    const listRes = await fetch(`${baseUrl}/api/rooms`);
    const listData = await listRes.json();
    expect(Array.isArray(listData.rooms)).toBe(true);
    const found = listData.rooms.find((r: any) => r.code === room.code);
    expect(found).toBeDefined();
    expect(found.maxPlayers).toBe(2);

    // 3. Quick join should be able to join an open room or create one
    const qRes = await fetch(`${baseUrl}/api/rooms/quick-join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mode: 'basic', maxPlayers: 2 }),
    });
    expect(qRes.status).toBe(200);
    const qData = await qRes.json();
    expect(qData.room).toBeDefined();
  });
});
