import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/auth/auth.service', () => ({
  AuthService: {
    register: vi.fn(),
    login: vi.fn(),
    getProfile: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import type { AuthenticatedRequest } from '../../src/modules/auth/auth.types';

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, ...overrides }) as unknown as Request;
const mockAuthReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    user: { id: 'u1', email: 'a@b.com', role: 'USER' },
    ...overrides,
  }) as unknown as AuthenticatedRequest;
const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

describe('AuthController error handling', () => {
  let next: NextFunction;
  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('register forwards errors to next', async () => {
    const err = new Error('conflict');
    vi.mocked(AuthService.register).mockRejectedValueOnce(err);
    await AuthController.register(mockReq({ body: {} }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('login forwards errors to next', async () => {
    const err = new Error('invalid');
    vi.mocked(AuthService.login).mockRejectedValueOnce(err);
    await AuthController.login(mockReq({ body: {} }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getProfile forwards errors to next', async () => {
    const err = new Error('not found');
    vi.mocked(AuthService.getProfile).mockRejectedValueOnce(err);
    await AuthController.getProfile(mockAuthReq() as any, mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('refreshToken forwards errors to next', async () => {
    const err = new Error('invalid token');
    vi.mocked(AuthService.refreshToken).mockRejectedValueOnce(err);
    await AuthController.refreshToken(mockReq({ body: { refreshToken: 'bad' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
