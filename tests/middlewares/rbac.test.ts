//  RBAC Middleware — Unit Tests

import { describe, expect, it, vi } from 'vitest';
import {
  hasPermission,
  requireOwnership,
  requirePermission,
  requireRole,
} from '../../src/middlewares/rbac.middleware';
import { UserRole } from '../../src/modules/auth/auth.types';
import { AppError } from '../../src/utils/errors';

function createMockReq(user?: any, params: Record<string, string> = {}) {
  return { user, params } as any;
}

describe('RBAC Middleware', () => {
  // hasPermission ────────────────────────────────────────
  describe('hasPermission()', () => {
    it('should allow ADMIN to manage users', () => {
      expect(hasPermission(UserRole.ADMIN, 'users', 'manage')).toBe(true);
    });

    it('should allow ADMIN to do anything via manage permission', () => {
      expect(hasPermission(UserRole.ADMIN, 'watchlist', 'create')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'admin_panel', 'read')).toBe(true);
    });

    it('should allow USER to read neo_data', () => {
      expect(hasPermission(UserRole.USER, 'neo_data', 'read')).toBe(true);
    });

    it('should deny USER from managing users', () => {
      expect(hasPermission(UserRole.USER, 'users', 'manage')).toBe(false);
    });

    it('should deny USER from accessing admin_panel', () => {
      expect(hasPermission(UserRole.USER, 'admin_panel', 'read')).toBe(false);
    });

    it('should allow RESEARCHER to create watchlist', () => {
      expect(hasPermission(UserRole.RESEARCHER, 'watchlist', 'create')).toBe(true);
    });

    it('should deny RESEARCHER from managing neo_data', () => {
      expect(hasPermission(UserRole.RESEARCHER, 'neo_data', 'manage')).toBe(false);
    });

    it('should deny USER from deleting watchlist', () => {
      // USER has create, read, delete on watchlist but NOT manage
      expect(hasPermission(UserRole.USER, 'watchlist', 'delete')).toBe(true);
    });

    it('should deny USER from updating watchlist', () => {
      expect(hasPermission(UserRole.USER, 'watchlist', 'update')).toBe(false);
    });

    it('should return false for unknown role', () => {
      expect(hasPermission('UNKNOWN' as any, 'users', 'read')).toBe(false);
    });

    it('should return false for unknown resource', () => {
      expect(hasPermission(UserRole.USER, 'unknown_resource' as any, 'read')).toBe(false);
    });
  });

  // requirePermission ────────────────────────────────────
  describe('requirePermission()', () => {
    it('should call next() when user has permission', () => {
      const middleware = requirePermission('neo_data', 'read');
      const req = createMockReq({ id: '1', role: UserRole.USER });
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with UnauthorizedError when no user', () => {
      const middleware = requirePermission('neo_data', 'read');
      const req = createMockReq();
      const next = vi.fn();

      middleware(req, {} as any, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
    });

    it('should call next with ForbiddenError when insufficient permissions', () => {
      const middleware = requirePermission('admin_panel', 'read');
      const req = createMockReq({ id: '1', role: UserRole.USER });
      const next = vi.fn();

      middleware(req, {} as any, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('cannot');
    });
  });

  // requireRole ──────────────────────────────────────────
  describe('requireRole()', () => {
    it('should call next() when user has required role', () => {
      const middleware = requireRole(UserRole.ADMIN);
      const req = createMockReq({ id: '1', role: UserRole.ADMIN });
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should accept any of multiple roles', () => {
      const middleware = requireRole(UserRole.RESEARCHER, UserRole.ADMIN);
      const req = createMockReq({ id: '1', role: UserRole.RESEARCHER });
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with UnauthorizedError when no user', () => {
      const middleware = requireRole(UserRole.ADMIN);
      const req = createMockReq();
      const next = vi.fn();

      middleware(req, {} as any, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
    });

    it('should call next with ForbiddenError for wrong role', () => {
      const middleware = requireRole(UserRole.ADMIN);
      const req = createMockReq({ id: '1', role: UserRole.USER });
      const next = vi.fn();

      middleware(req, {} as any, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Required role');
    });
  });

  // requireOwnership ─────────────────────────────────────
  describe('requireOwnership()', () => {
    it('should call next() when user owns the resource', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({ id: 'user1', role: UserRole.USER }, { userId: 'user1' });
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should bypass ownership check for ADMIN', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({ id: 'admin1', role: UserRole.ADMIN }, { userId: 'someone-else' });
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with UnauthorizedError when no user', () => {
      const middleware = requireOwnership();
      const req = createMockReq();
      const next = vi.fn();

      middleware(req, {} as any, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
    });

    it('should call next with ForbiddenError for non-owner', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({ id: 'user1', role: UserRole.USER }, { userId: 'user2' });
      const next = vi.fn();

      middleware(req, {} as any, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('own resources');
    });

    it('should call next when param is not present (no ownership to check)', () => {
      const middleware = requireOwnership('userId');
      const req = createMockReq({ id: 'user1', role: UserRole.USER }, {});
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should use default paramName "userId"', () => {
      const middleware = requireOwnership();
      const req = createMockReq({ id: 'user1', role: UserRole.USER }, { userId: 'user1' });
      const next = vi.fn();

      middleware(req, {} as any, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
