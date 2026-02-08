import { type Request, type Response, Router } from 'express';
import alertRoutes from './modules/alerts/alerts.routes';
import apodRoutes from './modules/apod/apod.routes';
import authRoutes from './modules/auth/auth.routes';
import cneosRoutes from './modules/cneos/cneos.routes';
import epicRoutes from './modules/epic/epic.routes';
import mediaRoutes from './modules/media/media.routes';
import neoRoutes from './modules/neo/neo.routes';
import spaceWeatherRoutes from './modules/space-weather/space-weather.routes';
import watchlistRoutes from './modules/watchlist/watchlist.routes';

const router = Router();

/** Health check endpoint returning uptime and status. */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: '🚀 Cosmic Watch API is operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use('/auth', authRoutes);
router.use('/neo', neoRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/alerts', alertRoutes);
router.use('/cneos', cneosRoutes);
router.use('/space-weather', spaceWeatherRoutes);
router.use('/apod', apodRoutes);
router.use('/epic', epicRoutes);
router.use('/media', mediaRoutes);

export default router;
