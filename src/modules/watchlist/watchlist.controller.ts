import type { NextFunction, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { WatchlistService } from './watchlist.service';

/** Handles HTTP requests for per-user asteroid watchlist management. */
export const WatchlistController = {
  /** POST /api/v1/watchlist — add an asteroid to the watchlist. */
  async add(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await WatchlistService.addToWatchlist(req.user!.id, req.body);
      ApiResponseHelper.created(res, result, 'Added to watchlist');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/watchlist — paginated list of watched asteroids. */
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await WatchlistService.getWatchlist(req.user!.id, page, limit);
      ApiResponseHelper.success(res, result.items, 'Watchlist retrieved', 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /api/v1/watchlist/:asteroidId — remove an asteroid from the watchlist. */
  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await WatchlistService.removeFromWatchlist(req.user!.id, req.params.asteroidId as string);
      ApiResponseHelper.success(res, null, 'Removed from watchlist');
    } catch (error) {
      next(error);
    }
  },

  /** PATCH /api/v1/watchlist/:asteroidId — update watchlist item settings. */
  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await WatchlistService.updateWatchlistItem(
        req.user!.id,
        req.params.asteroidId as string,
        req.body
      );
      ApiResponseHelper.success(res, result, 'Watchlist item updated');
    } catch (error) {
      next(error);
    }
  },
};
