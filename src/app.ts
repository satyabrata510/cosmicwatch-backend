import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config';
import { errorHandler, globalLimiter } from './middlewares';
import routes from './routes';
import { logger } from './utils';

/** Creates and configures the Express application with all middleware and routes. */
export function createApp(): Application {
  const app = express();

  app.use(helmet());

  app.use(globalLimiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  app.use(compression());

  app.use(pinoHttp({ logger, autoLogging: true }));

  app.use(`/api/${env.apiVersion}`, routes);

  /** Root health-check endpoint returning API metadata. */
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: '🌌 Cosmic Watch API',
      version: '1.0.0',
      description: 'Interstellar Asteroid Tracker & Risk Analyser',
      documentation: `/api/${env.apiVersion}/health`,
    });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
    });
  });

  app.use(errorHandler);

  return app;
}
