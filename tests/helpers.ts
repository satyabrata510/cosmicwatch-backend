//  Test Helpers
//  Shared utilities for creating test data and auth tokens

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { createApp } from '../src/app';
import { env, prisma } from '../src/config';

// Shared app instance for all tests ──────────────────────
export const app = createApp();
export const request = supertest(app);

export const API = `/api/${env.apiVersion}`;

// User factory ───────────────────────────────────────────
interface CreateUserOptions {
  name?: string;
  email?: string;
  password?: string;
  role?: 'USER' | 'RESEARCHER' | 'ADMIN';
}

export async function createTestUser(opts: CreateUserOptions = {}) {
  const password = opts.password ?? 'TestPass1';
  const hashedPassword = await bcrypt.hash(password, 4); // low rounds for speed

  const user = await prisma.user.create({
    data: {
      name: opts.name ?? 'Test User',
      email: opts.email ?? `test-${Date.now()}@cosmic.dev`,
      password: hashedPassword,
      role: opts.role ?? 'USER',
    },
  });

  return { user, plainPassword: password };
}

// JWT helpers ────────────────────────────────────────────
export function generateAccessToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.jwt.secret, {
    expiresIn: '15m',
  });
}

export function generateRefreshToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.jwt.refreshSecret, {
    expiresIn: '7d',
  });
}

export function generateExpiredToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.jwt.secret, {
    expiresIn: '0s',
  });
}

// Register + get tokens via API ──────────────────────────
export async function registerAndLogin(opts: CreateUserOptions = {}) {
  const { user, plainPassword } = await createTestUser(opts);
  const token = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  return { user, token, refreshToken, plainPassword };
}

// Alert factory ──────────────────────────────────────────
export async function createTestAlert(
  userId: string,
  overrides: Partial<{
    asteroidId: string;
    asteroidName: string;
    alertType: 'CLOSE_APPROACH' | 'HAZARDOUS_DETECTED' | 'WATCHLIST_UPDATE';
    message: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    isRead: boolean;
    approachDate: Date;
    missDistanceKm: number;
    velocityKmph: number;
  }> = {}
) {
  return prisma.alert.create({
    data: {
      userId,
      asteroidId: overrides.asteroidId ?? '2021277',
      asteroidName: overrides.asteroidName ?? '(2021 QM1)',
      alertType: overrides.alertType ?? 'CLOSE_APPROACH',
      message: overrides.message ?? 'Asteroid approaching Earth',
      riskLevel: overrides.riskLevel ?? 'MEDIUM',
      isRead: overrides.isRead ?? false,
      approachDate: overrides.approachDate ?? new Date('2026-04-13'),
      missDistanceKm: overrides.missDistanceKm ?? 5_000_000,
      velocityKmph: overrides.velocityKmph ?? 30_000,
    },
  });
}

// Watchlist factory ──────────────────────────────────────
export async function createTestWatchlistItem(
  userId: string,
  overrides: Partial<{
    asteroidId: string;
    asteroidName: string;
    alertOnApproach: boolean;
    alertDistanceKm: number;
  }> = {}
) {
  return prisma.watchlist.create({
    data: {
      userId,
      asteroidId: overrides.asteroidId ?? `ast-${Date.now()}`,
      asteroidName: overrides.asteroidName ?? 'Test Asteroid',
      alertOnApproach: overrides.alertOnApproach ?? true,
      alertDistanceKm: overrides.alertDistanceKm ?? 7_500_000,
    },
  });
}
