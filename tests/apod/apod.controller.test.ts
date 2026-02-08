import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/apod/apod.service', () => ({
  ApodService: {
    getToday: vi.fn(),
    getRandom: vi.fn(),
    getRange: vi.fn(),
  },
}));

import { ApodController } from '../../src/modules/apod/apod.controller';
import { ApodService } from '../../src/modules/apod/apod.service';

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, ...overrides }) as unknown as Request;
const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

describe('ApodController error handling', () => {
  let next: NextFunction;
  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('getToday forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(ApodService.getToday).mockRejectedValueOnce(err);
    await ApodController.getToday(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getRandom forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(ApodService.getRandom).mockRejectedValueOnce(err);
    await ApodController.getRandom(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getRange forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(ApodService.getRange).mockRejectedValueOnce(err);
    await ApodController.getRange(
      mockReq({ query: { start_date: '2024-01-01', end_date: '2024-01-05' } }),
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalledWith(err);
  });
});
