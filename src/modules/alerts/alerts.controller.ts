import type { NextFunction, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AlertService } from './alerts.service';

/** Handles HTTP requests for user alert management. */
export const AlertController = {
  /** GET /api/v1/alerts — paginated list with optional unread filter. */
  async getAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const unreadOnly = req.query.unread === 'true';

      const result = await AlertService.getUserAlerts(req.user!.id, page, limit, unreadOnly);
      ApiResponseHelper.success(res, result.items, 'Alerts retrieved', 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  /** PATCH /api/v1/alerts/:alertId/read — mark a single alert as read. */
  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await AlertService.markAsRead(req.params.alertId as string, req.user!.id);
      ApiResponseHelper.success(res, null, 'Alert marked as read');
    } catch (error) {
      next(error);
    }
  },

  /** PATCH /api/v1/alerts/read-all — bulk mark every alert as read. */
  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await AlertService.markAllAsRead(req.user!.id);
      ApiResponseHelper.success(res, null, 'All alerts marked as read');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/alerts/unread-count — return the number of unread alerts. */
  async getUnreadCount(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const count = await AlertService.getUnreadCount(req.user!.id);
      ApiResponseHelper.success(res, { count }, 'Unread count retrieved');
    } catch (error) {
      next(error);
    }
  },
};
