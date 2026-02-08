import { Router } from 'express';
import { nasaApiLimiter } from '../../middlewares';
import { ApodController } from './apod.controller';

const router = Router();

router.get('/today', nasaApiLimiter, ApodController.getToday);
router.get('/random', nasaApiLimiter, ApodController.getRandom);
router.get('/range', nasaApiLimiter, ApodController.getRange);

export default router;
