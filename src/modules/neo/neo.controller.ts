import type { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import { CneosService } from '../cneos/cneos.service';
import { NeoService } from './neo.service';

/** Handles HTTP requests for Near-Earth Object tracking and risk analysis. */
export const NeoController = {
  /** GET /api/v1/neo/feed — NEO feed grouped by close-approach date. */
  async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };

      // Default to today if no dates provided
      const today = new Date().toISOString().split('T')[0];
      const startDate = start_date || today;
      const endDate = end_date || today;

      const feed = await NeoService.getFeed(startDate, endDate);
      ApiResponseHelper.success(res, feed, 'NEO feed retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/neo/lookup/:asteroidId — full detail for a single asteroid. */
  async lookup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const asteroidId = req.params.asteroidId as string;
      const asteroid = await NeoService.lookup(asteroidId);
      ApiResponseHelper.success(res, asteroid, 'Asteroid data retrieved');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/neo/risk — batch risk analysis via Python scientific engine. */
  async getRiskAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query as { start_date: string; end_date: string };

      const today = new Date().toISOString().split('T')[0];
      const startDate = start_date || today;
      const endDate = end_date || today;

      const feed = await NeoService.getFeed(startDate, endDate);
      const allAsteroids = Object.values(feed.near_earth_objects).flat();
      const riskAnalysis = await NeoService.analyzeRiskEnhanced(allAsteroids, {
        start: startDate,
        end: endDate,
      });

      ApiResponseHelper.success(res, riskAnalysis, 'Risk analysis completed');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/neo/lookup/:asteroidId/risk — single-asteroid risk analysis. */
  async lookupRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const asteroidId = req.params.asteroidId as string;
      const asteroid = await NeoService.lookup(asteroidId);
      const analysis = await NeoService.analyzeRiskSingle(asteroid);

      ApiResponseHelper.success(res, analysis, 'Asteroid risk analysis completed');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/neo/lookup/:asteroidId/sentry-risk — Sentry-enhanced risk assessment. */
  async lookupSentryRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const asteroidId = req.params.asteroidId as string;

      // Fetch NeoWs data
      const asteroid = await NeoService.lookup(asteroidId);

      // Try to fetch Sentry data for this object
      let sentryDetail: Awaited<ReturnType<typeof CneosService.getSentryDetail>> | undefined;
      try {
        sentryDetail = await CneosService.getSentryDetail(asteroidId);
      } catch {
        // Object not in Sentry — fall back to standard analysis
        const standardAnalysis = await NeoService.analyzeRiskSingle(asteroid);
        ApiResponseHelper.success(
          res,
          { ...standardAnalysis, sentry_available: false },
          'Asteroid risk analysis completed (not in Sentry monitoring)'
        );
        return;
      }

      // Run Sentry-enhanced analysis via Python engine
      const analysis = await NeoService.analyzeRiskSentryEnhanced(asteroid, {
        designation: sentryDetail.designation,
        cumulativeImpactProbability: sentryDetail.cumulativeImpactProbability,
        palermoCumulative: sentryDetail.palermoCumulative,
        palermoMax: sentryDetail.palermoMax,
        torinoMax: sentryDetail.torinoMax,
        impactEnergy: sentryDetail.impactEnergy,
        diameter: sentryDetail.diameter,
        mass: sentryDetail.mass,
        velocityImpact: sentryDetail.velocityImpact,
        velocityInfinity: sentryDetail.velocityInfinity,
        totalVirtualImpactors: sentryDetail.totalVirtualImpactors,
        virtualImpactors: sentryDetail.virtualImpactors,
      });

      ApiResponseHelper.success(res, analysis, 'Sentry-enhanced risk analysis completed');
    } catch (error) {
      next(error);
    }
  },
};
