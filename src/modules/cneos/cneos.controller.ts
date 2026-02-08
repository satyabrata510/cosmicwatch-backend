import type { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import { CneosService } from './cneos.service';

/** Handles HTTP requests for CNEOS close-approach, Sentry and fireball data. */
export const CneosController = {
  /** GET /api/v1/cneos/close-approaches — query close-approach data from SBDB. */
  async getCloseApproaches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date_min, date_max, dist_max, sort, limit, pha } = req.query as Record<
        string,
        string
      >;

      const data = await CneosService.getCloseApproaches({
        dateMin: date_min,
        dateMax: date_max,
        distMax: dist_max || '10LD',
        sort: sort || 'dist',
        limit: limit ? parseInt(limit, 10) : undefined,
        pha: pha === 'true',
      });

      ApiResponseHelper.success(res, data, 'Close approach data retrieved');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/cneos/sentry — list objects in CNEOS Sentry impact monitoring. */
  async getSentryList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ps_min, ip_min, h_max } = req.query as Record<string, string>;

      const data = await CneosService.getSentryList({
        psMin: ps_min ? parseFloat(ps_min) : undefined,
        ipMin: ip_min ? parseFloat(ip_min) : undefined,
        hMax: h_max ? parseFloat(h_max) : undefined,
      });

      ApiResponseHelper.success(res, data, 'Sentry impact monitoring data retrieved');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/cneos/sentry/:designation — detail for a single Sentry object. */
  async getSentryDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const designation = req.params.designation as string;
      const data = await CneosService.getSentryDetail(designation);
      ApiResponseHelper.success(res, data, `Sentry detail for ${designation}`);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/cneos/fireballs — query recorded fireball/bolide events. */
  async getFireballs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date_min, date_max, limit, sort, energy_min, req_loc } = req.query as Record<
        string,
        string
      >;

      const data = await CneosService.getFireballs({
        dateMin: date_min,
        dateMax: date_max,
        limit: limit ? parseInt(limit, 10) : undefined,
        sort,
        energyMin: energy_min ? parseFloat(energy_min) : undefined,
        reqLoc: req_loc === 'true',
      });

      ApiResponseHelper.success(res, data, 'Fireball data retrieved');
    } catch (error) {
      next(error);
    }
  },
};
