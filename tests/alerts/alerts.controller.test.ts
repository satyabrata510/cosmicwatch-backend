import type { NextFunction, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/alerts/alerts.service', () => ({
  AlertService: {
    getUserAlerts: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
  },
}));

import { AlertController } from '../../src/modules/alerts/alerts.controller';
import { AlertService } from '../../src/modules/alerts/alerts.service';
import type { AuthenticatedRequest } from '../../src/modules/auth/auth.types';

const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    user: { id: 'u1', email: 'a@b.com', role: 'USER' },
    ...overrides,
  }) as unknown as AuthenticatedRequest;

const mockRes = () =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  }) as unknown as Response;

describe('AlertController error handling', () => {
  let next: NextFunction;
  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('getAlerts forwards errors to next', async () => {
    const err = new Error('db fail');
    vi.mocked(AlertService.getUserAlerts).mockRejectedValueOnce(err);
    await AlertController.getAlerts(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('markAsRead forwards errors to next', async () => {
    const err = new Error('not found');
    vi.mocked(AlertService.markAsRead).mockRejectedValueOnce(err);
    await AlertController.markAsRead(mockReq({ params: { alertId: 'a1' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('markAllAsRead forwards errors to next', async () => {
    const err = new Error('fail');
    vi.mocked(AlertService.markAllAsRead).mockRejectedValueOnce(err);
    await AlertController.markAllAsRead(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getUnreadCount forwards errors to next', async () => {
    const err = new Error('fail');
    vi.mocked(AlertService.getUnreadCount).mockRejectedValueOnce(err);
    await AlertController.getUnreadCount(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
