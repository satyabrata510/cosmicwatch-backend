import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/media/media.service', () => ({
  MediaService: {
    search: vi.fn(),
    getAsset: vi.fn(),
  },
}));

import { MediaController } from '../../src/modules/media/media.controller';
import { MediaService } from '../../src/modules/media/media.service';

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, ...overrides }) as unknown as Request;
const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

describe('MediaController error handling', () => {
  let next: NextFunction;
  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('search forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(MediaService.search).mockRejectedValueOnce(err);
    await MediaController.search(mockReq({ query: { q: 'asteroid' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getAsset forwards errors to next', async () => {
    const err = new Error('not found');
    vi.mocked(MediaService.getAsset).mockRejectedValueOnce(err);
    await MediaController.getAsset(mockReq({ params: { nasaId: 'PIA123' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
