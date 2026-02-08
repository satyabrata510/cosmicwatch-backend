import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/space-weather/space-weather.service', () => ({
  SpaceWeatherService: {
    getCme: vi.fn(),
    getSolarFlares: vi.fn(),
    getGeomagneticStorms: vi.fn(),
    getNotifications: vi.fn(),
  },
}));

import { SpaceWeatherController } from '../../src/modules/space-weather/space-weather.controller';
import { SpaceWeatherService } from '../../src/modules/space-weather/space-weather.service';

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, ...overrides }) as unknown as Request;
const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

describe('SpaceWeatherController error handling', () => {
  let next: NextFunction;
  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('getCme forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(SpaceWeatherService.getCme).mockRejectedValueOnce(err);
    await SpaceWeatherController.getCme(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getSolarFlares forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(SpaceWeatherService.getSolarFlares).mockRejectedValueOnce(err);
    await SpaceWeatherController.getSolarFlares(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getGeomagneticStorms forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(SpaceWeatherService.getGeomagneticStorms).mockRejectedValueOnce(err);
    await SpaceWeatherController.getGeomagneticStorms(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getNotifications forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(SpaceWeatherService.getNotifications).mockRejectedValueOnce(err);
    await SpaceWeatherController.getNotifications(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
