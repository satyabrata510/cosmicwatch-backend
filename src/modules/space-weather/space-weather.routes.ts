import { Router } from 'express';
import { nasaApiLimiter } from '../../middlewares';
import { SpaceWeatherController } from './space-weather.controller';

const router = Router();

router.get('/cme', nasaApiLimiter, SpaceWeatherController.getCme);
router.get('/flares', nasaApiLimiter, SpaceWeatherController.getSolarFlares);
router.get('/storms', nasaApiLimiter, SpaceWeatherController.getGeomagneticStorms);
router.get('/notifications', nasaApiLimiter, SpaceWeatherController.getNotifications);

export default router;
