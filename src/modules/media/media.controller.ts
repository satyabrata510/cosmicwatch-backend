import type { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import { MediaService } from './media.service';

/** Handles HTTP requests for the NASA Image & Video Library. */
export const MediaController = {
  /** GET /api/v1/media/search — search NASA media assets by keyword. */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, media_type, year_start, year_end, page } = req.query as Record<string, string>;

      if (!q) {
        res.status(400).json({
          success: false,
          message: 'Query parameter "q" is required',
        });
        return;
      }

      const data = await MediaService.search({
        query: q,
        mediaType: media_type,
        yearStart: year_start ? parseInt(year_start, 10) : undefined,
        yearEnd: year_end ? parseInt(year_end, 10) : undefined,
        page: page ? parseInt(page, 10) : undefined,
      });

      ApiResponseHelper.success(res, data, 'NASA media search completed');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/media/asset/:nasaId — retrieve asset manifest for a media item. */
  async getAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const nasaId = req.params.nasaId as string;
      const assets = await MediaService.getAsset(nasaId);
      ApiResponseHelper.success(res, { nasaId, assets }, 'NASA media assets retrieved');
    } catch (error) {
      next(error);
    }
  },
};
