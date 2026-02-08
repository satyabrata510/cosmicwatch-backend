import pino from 'pino';
import { isDev } from '../config/env.config';

/**
 * Main application logger using Pino
 * - Dev: pino-pretty with colors & timestamps
 * - Prod: structured JSON for log aggregation
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '🌌 {msg}',
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'cosmicwatch-api',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/** Child loggers for specific modules */
export const dbLogger = logger.child({ module: 'database' });
export const authLogger = logger.child({ module: 'auth' });
export const neoLogger = logger.child({ module: 'neo-api' });
export const socketLogger = logger.child({ module: 'socket' });
