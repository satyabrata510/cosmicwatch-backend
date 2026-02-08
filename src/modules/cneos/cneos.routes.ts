import { Router } from 'express';
import { nasaApiLimiter } from '../../middlewares';
import { CneosController } from './cneos.controller';

const router = Router();

router.get('/close-approaches', nasaApiLimiter, CneosController.getCloseApproaches);
router.get('/sentry', nasaApiLimiter, CneosController.getSentryList);
router.get('/sentry/:designation', nasaApiLimiter, CneosController.getSentryDetail);
router.get('/fireballs', nasaApiLimiter, CneosController.getFireballs);

export default router;
