import http from 'node:http';
import { createApp } from './app';
import { connectDatabase, connectRedis, disconnectDatabase, disconnectRedis, env } from './config';
import { startAlertScheduler, stopAlertScheduler } from './modules/alerts/alerts.scheduler';
import { NeoService } from './modules/neo/neo.service';
import { logger } from './utils';
import { disconnectRiskEngineSocket, initializeSocket } from './websocket';

async function bootstrap(): Promise<void> {
  // Create Express app
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.io
  initializeSocket(server);

  // Connect to database
  await connectDatabase();

  // Connect to Redis cache
  await connectRedis();

  // Connect to Python risk engine
  await NeoService.connectRiskEngine();

  // Start HTTP server
  server.listen(env.port, () => {
    logger.info(
      {
        port: env.port,
        env: env.node_env,
        api: `/api/${env.apiVersion}`,
        websocket: true,
      },
      '🌌 Cosmic Watch API Server started'
    );

    // Start the close-approach alert scheduler (cron every 6h)
    startAlertScheduler();
  });

  /** Handles graceful shutdown on process signals. */
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal — starting graceful shutdown');

    server.close(async () => {
      stopAlertScheduler();
      disconnectRiskEngineSocket();
      await disconnectRedis();
      await disconnectDatabase();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force kill after 10 seconds
    setTimeout(() => {
      logger.fatal('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Log unhandled errors before exit
  process.on('unhandledRejection', (reason: Error) => {
    logger.error({ err: reason }, 'Unhandled Rejection');
  });

  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught Exception');
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
