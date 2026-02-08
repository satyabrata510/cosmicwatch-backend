import type { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import { SpaceWeatherService } from './space-weather.service';

/** Handles HTTP requests for DONKI space-weather event data. */
export const SpaceWeatherController = {
  /** GET /api/v1/space-weather/cme — coronal mass ejection events. */
  async getCme(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as Record<string, string>;
      const data = await SpaceWeatherService.getCme(start_date, end_date);
      ApiResponseHelper.success(res, data, 'Coronal mass ejection data retrieved');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/space-weather/flares — solar flare events. */
  async getSolarFlares(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as Record<string, string>;
      const data = await SpaceWeatherService.getSolarFlares(start_date, end_date);
      ApiResponseHelper.success(res, data, 'Solar flare data retrieved');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/space-weather/storms — geomagnetic storm events. */
  async getGeomagneticStorms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as Record<string, string>;
      const data = await SpaceWeatherService.getGeomagneticStorms(start_date, end_date);
      ApiResponseHelper.success(res, data, 'Geomagnetic storm data retrieved');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/space-weather/notifications — space-weather notification messages. */
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date, type } = req.query as Record<string, string>;
      const data = await SpaceWeatherService.getNotifications(start_date, end_date, type);
      ApiResponseHelper.success(res, data, 'Space weather notifications retrieved');
    } catch (error) {
      next(error);
    }
  },
};
