//  Auth Middleware — Unit Tests

import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config';
import { authenticate, authorize } from '../../src/middlewares/auth.middleware';
import { UserRole } from '../../src/modules/auth/auth.types';
import { AppError } from '../../src/utils/errors';

function createMockReq(headers: Record<string, string> = {}, user?: any) {
  return { headers, user } as any;
}

function createMockRes() {
  return {} as any;
}

describe('Auth Middleware', () => {
  describe('authenticate()', () => {
    it('should set req.user for valid token', () => {
      const payload = { id: '1', email: 'a@b.com', role: UserRole.USER };
      const token = jwt.sign(payload, env.jwt.secret, { expiresIn: '15m' });
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const next = vi.fn();

      authenticate(req, createMockRes(), next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('1');
      expect(req.user.email).toBe('a@b.com');
    });

    it('should call next with UnauthorizedError when no token', () => {
      const req = createMockReq({});
      const next = vi.fn();

      authenticate(req, createMockRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Access token is required');
    });

    it('should call next with UnauthorizedError for invalid token', () => {
      const req = createMockReq({ authorization: 'Bearer invalid.token.here' });
      const next = vi.fn();

      authenticate(req, createMockRes(), next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Invalid or expired token');
    });

    it('should call next with UnauthorizedError for expired token', () => {
      const payload = { id: '1', email: 'a@b.com', role: UserRole.USER };
      const token = jwt.sign(payload, env.jwt.secret, { expiresIn: '0s' });
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const next = vi.fn();

      authenticate(req, createMockRes(), next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
    });

    it('should handle Authorization header without Bearer prefix', () => {
      const req = createMockReq({ authorization: 'Token abc123' });
      const next = vi.fn();

      authenticate(req, createMockRes(), next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
    });
  });

  describe('authorize()', () => {
    it('should call next when user has required role', () => {
      const middleware = authorize(UserRole.USER, UserRole.ADMIN);
      const req = createMockReq({}, { id: '1', email: 'a@b.com', role: UserRole.USER });
      const next = vi.fn();

      middleware(req, createMockRes(), next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with UnauthorizedError when no user', () => {
      const middleware = authorize(UserRole.ADMIN);
      const req = createMockReq({});
      const next = vi.fn();

      middleware(req, createMockRes(), next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Authentication required');
    });

    it('should call next with ForbiddenError when role not in allowed list', () => {
      const middleware = authorize(UserRole.ADMIN);
      const req = createMockReq({}, { id: '1', email: 'a@b.com', role: UserRole.USER });
      const next = vi.fn();

      middleware(req, createMockRes(), next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Insufficient permissions');
    });

    it('should allow when user has ADMIN role in multi-role check', () => {
      const middleware = authorize(UserRole.RESEARCHER, UserRole.ADMIN);
      const req = createMockReq({}, { id: '1', email: 'a@b.com', role: UserRole.ADMIN });
      const next = vi.fn();

      middleware(req, createMockRes(), next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
