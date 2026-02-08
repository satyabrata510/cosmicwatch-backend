import type { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import { EpicService } from './epic.service';

/** Handles HTTP requests for EPIC (Earth Polychromatic Imaging Camera) images. */
export const EpicController = {
  /** GET /api/v1/epic/natural — natural-color Earth imagery. */
  async getNatural(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.query as Record<string, string>;
      const data = await EpicService.getNatural(date);
      ApiResponseHelper.success(res, data, 'EPIC natural color Earth images retrieved');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/epic/enhanced — enhanced-color Earth imagery. */
  async getEnhanced(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.query as Record<string, string>;
      const data = await EpicService.getEnhanced(date);
      ApiResponseHelper.success(res, data, 'EPIC enhanced color Earth images retrieved');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/epic/dates — list available image dates for a given type. */
  async getAvailableDates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = (req.query.type as string) === 'enhanced' ? 'enhanced' : 'natural';
      const dates = await EpicService.getAvailableDates(type);
      ApiResponseHelper.success(res, { type, dates }, 'EPIC available dates retrieved');
    } catch (error) {
      next(error);
    }
  },
};
