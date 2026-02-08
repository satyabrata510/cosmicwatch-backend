import { Router } from 'express';
import { nasaApiLimiter } from '../../middlewares';
import { EpicController } from './epic.controller';

const router = Router();

router.get('/natural', nasaApiLimiter, EpicController.getNatural);
router.get('/enhanced', nasaApiLimiter, EpicController.getEnhanced);
router.get('/dates', nasaApiLimiter, EpicController.getAvailableDates);

export default router;
