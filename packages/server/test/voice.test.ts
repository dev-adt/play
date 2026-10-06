import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../src/server.js';
import { db } from '../src/db/database.js';
import http from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { AddressInfo } from 'net';

describe('Voice Chat Signaling Socket Tests', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let token1: string;
  let token2: string;
  let user1: any;
  let user2: any;
  let roomCode: string;
  let socket1: ClientSocketType;
  let socket2: ClientSocketType;

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

    // 1. Create 2 guest accounts
    const res1 = await fetch(`${baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Voice Player 1' }),
    });
    const data1 = await res1.json();
    token1 = data1.token;
    user1 = data1.user;

    const res2 = await fetch(`${baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Voice Player 2' }),
    });
    const data2 = await res2.json();
    token2 = data2.token;
    user2 = data2.user;

    // 2. Create room with Player 1
    const createRes = await fetch(`${baseUrl}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        name: 'Phòng Voice Test',
        mode: 'basic',
        maxPlayers: 4,
        betAmount: 20,
      }),
    });
    const createData = await createRes.json();
    roomCode = createData.room.code;
  });

  afterAll(async () => {
    if (socket1 && socket1.connected) socket1.disconnect();
    if (socket2 && socket2.connected) socket2.disconnect();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('connects both client sockets to the server, joins room and takes seats', async () => {
    socket1 = ClientSocket(baseUrl, {
      auth: { token: token1 },
      reconnection: false,
      transports: ['websocket'],
    });
    socket2 = ClientSocket(baseUrl, {
      auth: { token: token2 },
      reconnection: false,
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        socket1.on('connect', () => resolve());
        socket1.on('connect_error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        socket2.on('connect', () => resolve());
        socket2.on('connect_error', reject);
      }),
    ]);

    expect(socket1.connected).toBe(true);
    expect(socket2.connected).toBe(true);

    // Join room via game socket
    await new Promise<void>((resolve) => {
      socket1.emit('join_room', { roomCode }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      socket2.emit('join_room', { roomCode }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // Take seats
    await new Promise<void>((resolve) => {
      socket1.emit('take_seat', { roomCode, seatIndex: 0 }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      socket2.emit('take_seat', { roomCode, seatIndex: 1 }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });
  });

  it('handles voice_join and notifies peers with peer list and peer_joined event', async () => {
    // Socket 1 joins voice
    const peersData1 = await new Promise<any>((resolve) => {
      socket1.emit('voice_join', { roomCode }, (res: any) => {
        resolve(res);
      });
    });
    expect(peersData1.success).toBe(true);
    expect(Array.isArray(peersData1.peers)).toBe(true);
    // User 2 has not called voice_join yet, but is seated in room
    expect(peersData1.peers.some((p: any) => p.userId === user2.userId)).toBe(true);

    // Socket 1 listens for voice_peer_joined
    const peerJoinedPromise = new Promise<any>((resolve) => {
      socket1.once('voice_peer_joined', (data) => resolve(data));
    });

    // Socket 2 joins voice
    const peersData2 = await new Promise<any>((resolve) => {
      socket2.emit('voice_join', { roomCode }, (res: any) => {
        resolve(res);
      });
    });
    expect(peersData2.success).toBe(true);
    expect(peersData2.peers.some((p: any) => p.userId === user1.userId)).toBe(true);

    const peerJoined = await peerJoinedPromise;
    expect(peerJoined.userId).toBe(user2.userId);
    expect(peerJoined.socketId).toBe(socket2.id);
  });

  it('routes voice_signal between two peers', async () => {
    const fakeSignal = { type: 'offer', sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\n' };

    const signalPromise = new Promise<any>((resolve) => {
      socket2.once('voice_signal', (data) => resolve(data));
    });

    socket1.emit('voice_signal', {
      roomCode,
      targetSocketId: socket2.id,
      signal: fakeSignal,
    });

    const received = await signalPromise;
    expect(received.fromSocketId).toBe(socket1.id);
    expect(received.fromUserId).toBe(user1.userId);
    expect(received.signal).toEqual(fakeSignal);
  });

  it('broadcasts voice_status changes to room peers', async () => {
    const statusPromise = new Promise<any>((resolve) => {
      socket2.once('voice_peer_status', (data) => resolve(data));
    });

    socket1.emit('voice_status', {
      roomCode,
      isMicOn: true,
      isSpeaking: true,
      isDeafened: false,
    });

    const status = await statusPromise;
    expect(status.socketId).toBe(socket1.id);
    expect(status.userId).toBe(user1.userId);
    expect(status.isMicOn).toBe(true);
    expect(status.isSpeaking).toBe(true);
    expect(status.isDeafened).toBe(false);
  });

  it('handles voice_leave correctly and notifies peer', async () => {
    const peerLeftPromise = new Promise<any>((resolve) => {
      socket2.once('voice_peer_left', (data) => resolve(data));
    });

    socket1.emit('voice_leave', { roomCode });

    const left = await peerLeftPromise;
    expect(left.socketId).toBe(socket1.id);
    expect(left.userId).toBe(user1.userId);
  });

  it('notifies peer when a socket disconnects', async () => {
    // Socket 1 re-joins voice
    await new Promise<void>((resolve) => {
      socket1.emit('voice_join', { roomCode }, () => resolve());
    });

    const peerLeftPromise = new Promise<any>((resolve) => {
      socket2.once('voice_peer_left', (data) => resolve(data));
    });

    const s1Id = socket1.id;
    // Socket 1 disconnects
    socket1.disconnect();

    const left = await peerLeftPromise;
    expect(left.socketId).toBe(s1Id);
    expect(left.userId).toBe(user1.userId);
  });
});
