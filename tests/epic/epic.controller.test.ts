import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/epic/epic.service', () => ({
  EpicService: {
    getNatural: vi.fn(),
    getEnhanced: vi.fn(),
    getAvailableDates: vi.fn(),
  },
}));

import { EpicController } from '../../src/modules/epic/epic.controller';
import { EpicService } from '../../src/modules/epic/epic.service';

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, ...overrides }) as unknown as Request;
const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

describe('EpicController error handling', () => {
  let next: NextFunction;
  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('getNatural forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(EpicService.getNatural).mockRejectedValueOnce(err);
    await EpicController.getNatural(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getEnhanced forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(EpicService.getEnhanced).mockRejectedValueOnce(err);
    await EpicController.getEnhanced(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getAvailableDates forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(EpicService.getAvailableDates).mockRejectedValueOnce(err);
    await EpicController.getAvailableDates(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
