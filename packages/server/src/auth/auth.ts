import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { db, UserRow } from '../db/database.js';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  displayName: string;
  isAdmin?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
  cookies: Record<string, string>;
  body: any;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.sessionSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, config.sessionSecret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Express middleware for authenticating requests via cookie or Bearer header.
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (!token) {
    res.status(401).json({ error: 'Chưa đăng nhập' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ' });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Socket.IO auth validator
 */
export function authenticateSocketToken(token: string | undefined): AuthTokenPayload | null {
  if (!token) return null;
  return verifyToken(token);
}
