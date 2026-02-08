import { Router } from 'express';
import { nasaApiLimiter } from '../../middlewares';
import { MediaController } from './media.controller';

const router = Router();

router.get('/search', nasaApiLimiter, MediaController.search);
router.get('/asset/:nasaId', nasaApiLimiter, MediaController.getAsset);

export default router;
