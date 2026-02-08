import type { NextFunction, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/watchlist/watchlist.service', () => ({
  WatchlistService: {
    addToWatchlist: vi.fn(),
    getWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
    updateWatchlistItem: vi.fn(),
  },
}));

import type { AuthenticatedRequest } from '../../src/modules/auth/auth.types';
import { WatchlistController } from '../../src/modules/watchlist/watchlist.controller';
import { WatchlistService } from '../../src/modules/watchlist/watchlist.service';

const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    user: { id: 'u1', email: 'a@b.com', role: 'USER' },
    ...overrides,
  }) as unknown as AuthenticatedRequest;

const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

describe('WatchlistController error handling', () => {
  let next: NextFunction;
  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('add forwards errors to next', async () => {
    const err = new Error('fail');
    vi.mocked(WatchlistService.addToWatchlist).mockRejectedValueOnce(err);
    await WatchlistController.add(mockReq({ body: { asteroidId: 'a1' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getAll forwards errors to next', async () => {
    const err = new Error('db fail');
    vi.mocked(WatchlistService.getWatchlist).mockRejectedValueOnce(err);
    await WatchlistController.getAll(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('remove forwards errors to next', async () => {
    const err = new Error('not found');
    vi.mocked(WatchlistService.removeFromWatchlist).mockRejectedValueOnce(err);
    await WatchlistController.remove(mockReq({ params: { asteroidId: 'a1' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('update forwards errors to next', async () => {
    const err = new Error('fail');
    vi.mocked(WatchlistService.updateWatchlistItem).mockRejectedValueOnce(err);
    await WatchlistController.update(
      mockReq({ params: { asteroidId: 'a1' }, body: { notes: 'new' } }),
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalledWith(err);
  });
});
