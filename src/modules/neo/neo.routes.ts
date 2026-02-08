import { Router } from 'express';
import { nasaApiLimiter } from '../../middlewares';
import { NeoController } from './neo.controller';

const router = Router();

router.get('/feed', nasaApiLimiter, NeoController.getFeed);
router.get('/lookup/:asteroidId', nasaApiLimiter, NeoController.lookup);
router.get('/lookup/:asteroidId/risk', nasaApiLimiter, NeoController.lookupRisk);
router.get('/lookup/:asteroidId/sentry-risk', nasaApiLimiter, NeoController.lookupSentryRisk);
router.get('/risk', nasaApiLimiter, NeoController.getRiskAnalysis);

export default router;
