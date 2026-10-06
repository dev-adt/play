import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../src/server.js';
import { db } from '../src/db/database.js';
import { hashPassword } from '../src/auth/auth.js';
import { GameInstance } from '../src/game/GameInstance.js';
import http from 'http';
import { AddressInfo } from 'net';

describe('Currency & Daily Streak Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await db.init();
    await db.ensureAdminUser(await hashPassword('admin123'));
    const appInstance = createServer();
    server = appInstance.server;
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('Guest account is awarded 1000$ upon creation', async () => {
    const res = await fetch(`${baseUrl}/api/auth/guest`, { method: 'POST' });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.balance).toBe(1000);
  });

  it('Room creation enforces betAmount >= 10 and multiple of 10', async () => {
    // 1. Login guest
    const guestRes = await fetch(`${baseUrl}/api/auth/guest`, { method: 'POST' });
    const { token } = await guestRes.json();

    // Invalid bet amount: 5
    const resInvalid5 = await fetch(`${baseUrl}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Bàn test 5$', mode: 'basic', betAmount: 5 }),
    });
    expect(resInvalid5.status).toBe(400);

    // Invalid bet amount: 25 (not multiple of 10)
    const resInvalid25 = await fetch(`${baseUrl}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Bàn test 25$', mode: 'basic', betAmount: 25 }),
    });
    expect(resInvalid25.status).toBe(400);

    // Valid bet amount: 50
    const resValid50 = await fetch(`${baseUrl}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Bàn test 50$', mode: 'basic', betAmount: 50 }),
    });
    expect(resValid50.status).toBe(201);
    const validData = await resValid50.json();
    expect(validData.room.betAmount).toBe(50);
  });

  it('Daily login reward claims day 1 (1000$) and prevents second claim today', async () => {
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `streak_test_${Date.now()}`,
        password: 'password123',
        displayName: 'Streak Tester',
      }),
    });
    const { user, token } = await registerRes.json();
    expect(user.balance).toBe(1000);

    // Check status before claim
    const statusRes = await fetch(`${baseUrl}/api/daily-reward/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statusData = await statusRes.json();
    expect(statusData.status.canClaim).toBe(true);
    expect(statusData.status.nextRewardDay).toBe(1);
    expect(statusData.status.nextRewardAmount).toBe(1000);

    // Claim reward day 1
    const claimRes = await fetch(`${baseUrl}/api/daily-reward/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(claimRes.status).toBe(200);
    const claimData = await claimRes.json();
    expect(claimData.rewardAmount).toBe(1000);
    expect(claimData.currentStreak).toBe(1);
    expect(claimData.newBalance).toBe(2000); // 1000 initial + 1000 claim

    // Attempt claim again on same day should fail
    const claimAgainRes = await fetch(`${baseUrl}/api/daily-reward/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(claimAgainRes.status).toBe(400);
    const claimAgainData = await claimAgainRes.json();
    expect(claimAgainData.error).toContain('nhận quà đăng nhập hôm nay rồi');
  });

  it('Admin can inspect and adjust user balance (add, subtract, set)', async () => {
    // Login as admin
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const { token: adminToken } = await adminLoginRes.json();

    // Create target user
    const targetRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `admin_adjust_${Date.now()}`,
        password: 'password123',
        displayName: 'Target User',
      }),
    });
    const { user: targetUser } = await targetRes.json();
    const targetUserId = targetUser.userId || targetUser.id;
    expect(targetUser.balance).toBe(1000);

    // 1. Add 500$
    const addRes = await fetch(`${baseUrl}/api/admin/users/${targetUserId}/adjust-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'add', amount: 500 }),
    });
    expect(addRes.status).toBe(200);
    const addData = await addRes.json();
    expect(addData.balance).toBe(1500);

    // 2. Subtract 300$
    const subRes = await fetch(`${baseUrl}/api/admin/users/${targetUserId}/adjust-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'subtract', amount: 300 }),
    });
    expect(subRes.status).toBe(200);
    const subData = await subRes.json();
    expect(subData.balance).toBe(1200);

    // 3. Set to 10000$
    const setRes = await fetch(`${baseUrl}/api/admin/users/${targetUserId}/adjust-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'set', amount: 10000 }),
    });
    expect(setRes.status).toBe(200);
    const setData = await setRes.json();
    expect(setData.balance).toBe(10000);
  });

  it('GameInstance settles moneyDelta = scoreDelta * betAmount on game end', async () => {
    const game = new GameInstance({
      id: 'g_test_money',
      roomId: 'r_test_money',
      mode: 'basic',
      betAmount: 50,
      players: [
        { id: 'u1', username: 'p1', displayName: 'Player 1', seatIndex: 0, balance: 1000 },
        { id: 'u2', username: 'p2', displayName: 'Player 2', seatIndex: 1, balance: 1000 },
      ],
      onStateChange: () => {},
    });

    // p1 has 0 cards (won), p2 has 3 normal cards remaining (lost 3 points)
    game.players[0].hand = [];
    game.players[0].hasPlayedCard = true;
    game.players[1].hand = [
      { id: '4h', rank: '4', suit: 'hearts' },
      { id: '5d', rank: '5', suit: 'diamonds' },
      { id: '6c', rank: '6', suit: 'clubs' },
    ];
    game.players[1].hasPlayedCard = true;

    await game.endGame({
      winnerIds: ['u1'],
      endReason: 'normal',
      endReasonText: 'Tới bài',
    });

    expect(game.finalResult).toBeDefined();
    const r1 = game.finalResult!.playerResults.find(r => r.playerId === 'u1')!;
    const r2 = game.finalResult!.playerResults.find(r => r.playerId === 'u2')!;

    expect(r2.scoreDelta).toBe(-3);
    expect(r2.moneyDelta).toBe(-150); // -3 * 50 = -150$

    expect(r1.scoreDelta).toBe(3);
    expect(r1.moneyDelta).toBe(150); // +3 * 50 = +150$
  });
});
