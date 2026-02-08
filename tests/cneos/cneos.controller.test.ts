import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/cneos/cneos.service', () => ({
  CneosService: {
    getCloseApproaches: vi.fn(),
    getSentryList: vi.fn(),
    getSentryDetail: vi.fn(),
    getFireballs: vi.fn(),
  },
}));

import { CneosController } from '../../src/modules/cneos/cneos.controller';
import { CneosService } from '../../src/modules/cneos/cneos.service';

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, ...overrides }) as unknown as Request;
const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

describe('CneosController error handling', () => {
  let next: NextFunction;
  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('getCloseApproaches forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(CneosService.getCloseApproaches).mockRejectedValueOnce(err);
    await CneosController.getCloseApproaches(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getSentryList forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(CneosService.getSentryList).mockRejectedValueOnce(err);
    await CneosController.getSentryList(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getSentryDetail forwards errors to next', async () => {
    const err = new Error('not found');
    vi.mocked(CneosService.getSentryDetail).mockRejectedValueOnce(err);
    await CneosController.getSentryDetail(
      mockReq({ params: { designation: 'test' } }),
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getFireballs forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(CneosService.getFireballs).mockRejectedValueOnce(err);
    await CneosController.getFireballs(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
