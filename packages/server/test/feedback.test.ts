import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../src/server.js';
import { db } from '../src/db/database.js';
import { hashPassword } from '../src/auth/auth.js';
import http from 'http';
import { AddressInfo } from 'net';

describe('Wishes & Feedback Feature Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let userToken: string;
  let userId: string;
  let adminToken: string;
  let feedbackId: string;

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

    // 1. Create a normal player via register
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `player_wish_${Date.now()}`,
        password: 'password123',
        displayName: 'Người Chúc Hay',
      }),
    });
    const regData = await regRes.json();
    userToken = regData.token;
    userId = regData.user.id || regData.user.userId;

    // 2. Login as admin
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('Player submits funny wish and gets 201 Created', async () => {
    const res = await fetch(`${baseUrl}/api/feedback/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        type: 'wish',
        content: 'Admin đẹp trai phong độ ngời ngời, phát cho em ít lộc chơi suốt đời!',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.feedback).toBeDefined();
    expect(data.feedback.type).toBe('wish');
    expect(data.feedback.status).toBe('pending');
    expect(data.feedback.reward_amount).toBe(0);
    feedbackId = data.feedback.id;
  });

  it('Rejects wish with less than 5 characters', async () => {
    const res = await fetch(`${baseUrl}/api/feedback/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        type: 'wish',
        content: 'Hi',
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('ít nhất 5 ký tự');
  });

  it('Player retrieves their own wish list (GET /api/feedback/my)', async () => {
    const res = await fetch(`${baseUrl}/api/feedback/my`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.wishes)).toBe(true);
    const found = data.wishes.find((w: any) => w.id === feedbackId);
    expect(found).toBeDefined();
    expect(found.status).toBe('pending');
  });

  it('Admin retrieves all wishes (GET /api/admin/feedback)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/feedback?status=all`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.wishes)).toBe(true);
    const found = data.wishes.find((w: any) => w.id === feedbackId);
    expect(found).toBeDefined();
    expect(found.display_name).toBe('Người Chúc Hay');
  });

  it('Admin rewards the wish with +5,000$ and updates user balance', async () => {
    // Check initial user balance
    const userBefore = await db.getUserById(userId);
    const initialBalance = userBefore?.balance || 1000;

    const res = await fetch(`${baseUrl}/api/admin/feedback/${feedbackId}/reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rewardAmount: 5000,
        adminNote: 'Admin khen thơ hay, tặng nóng 5.000$ khởi nghiệp!',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.newBalance).toBe(initialBalance + 5000);
    expect(data.feedback.status).toBe('rewarded');
    expect(data.feedback.reward_amount).toBe(5000);

    // Verify user balance in database
    const userAfter = await db.getUserById(userId);
    expect(userAfter?.balance).toBe(initialBalance + 5000);

    // Verify player now sees rewarded status in my list
    const myRes = await fetch(`${baseUrl}/api/feedback/my`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const myData = await myRes.json();
    const updatedWish = myData.wishes.find((w: any) => w.id === feedbackId);
    expect(updatedWish.status).toBe('rewarded');
    expect(updatedWish.reward_amount).toBe(5000);
    expect(updatedWish.admin_note).toContain('Admin khen thơ hay');
  });
});
