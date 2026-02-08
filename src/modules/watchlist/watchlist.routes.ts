import { Router } from 'express';
import { authenticate, validate } from '../../middlewares';
import { WatchlistController } from './watchlist.controller';
import { addWatchlistSchema, updateWatchlistSchema } from './watchlist.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate(addWatchlistSchema), WatchlistController.add);
router.get('/', WatchlistController.getAll);
router.patch('/:asteroidId', validate(updateWatchlistSchema), WatchlistController.update);
router.delete('/:asteroidId', WatchlistController.remove);

export default router;
