import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { env } from './env.config';

const redisLogger = logger.child({ module: 'redis' });

let redis: Redis | null = null;

/** Lazily create and return a shared Redis client. */
export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Stop retrying after 5 attempts
        if (times > 5) {
          redisLogger.warn('Redis max retries reached — disabling Redis');
          return null;
        }
        const delay = Math.min(times * 200, 5000);
        redisLogger.warn({ attempt: times, nextRetryMs: delay }, 'Redis reconnecting');
        return delay;
      },
      lazyConnect: false, // Connect immediately
      enableOfflineQueue: false, // Don't queue commands when disconnected
      // Upstash-specific configuration
      family: 4, // Force IPv4
      tls: env.redis.url.startsWith('rediss://') ? {} : undefined,
      connectTimeout: 10000,
    });

    redis.on('connect', () => redisLogger.info('Redis connected'));
    redis.on('ready', () => redisLogger.info('Redis ready'));
    redis.on('error', (err) => redisLogger.error({ err }, 'Redis connection error'));
    redis.on('close', () => redisLogger.warn('Redis connection closed'));
  }
  return redis;
}

/** Establish the Redis connection (non-fatal on failure). */
export async function connectRedis(): Promise<void> {
  const client = getRedis();
  try {
    // Wait for Redis to be ready (with timeout)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Redis connection timeout')), 10000);

      client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    redisLogger.info(
      { url: env.redis.url.replace(/\/\/.*@/, '//<redacted>@') },
      'Redis connected successfully'
    );
  } catch (error) {
    redisLogger.error(
      { err: error },
      'Redis connection failed — caching disabled, falling back to direct API calls'
    );
    // Disconnect to stop retry attempts
    await client.quit().catch(() => {
      /* ignore quit errors */
    });
    redis = null;
    // Non-fatal: the app works without Redis, just slower
  }
}

/** Gracefully close the Redis connection. */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    redisLogger.info('Redis disconnected');
  }
}

/**
 * NASA API cache TTLs in seconds.
 *
 * @remarks
 * Values are based on actual NASA data update frequencies:
 * - APOD: Updates once daily (~midnight ET)
 * - NEO Feed: Updates every few hours as observations arrive
 * - NEO Lookup: Asteroid data changes rarely
 * - CNEOS CAD: Close approach data, updated every ~6h
 * - CNEOS Sentry: Impact monitoring, updated ~daily
 * - CNEOS Fireball: Historical bolide data, very infrequent
 * - DONKI (CME/FLR/GST): Space weather events, updated ~hourly
 * - DONKI Notifications: Near-real-time, shorter TTL
 * - EPIC: New images ~daily from DSCOVR satellite
 * - NASA Media: Static archive, very stable content
 * - Risk Engine: Deterministic computation (same input = same output)
 */
export const CacheTTL = {
  /** APOD changes once per day at midnight ET → 6 hours */
  APOD_TODAY: 6 * 60 * 60, // 6h
  /** Random APODs — NOT cached (each request should return different results) */
  // APOD_RANDOM: removed — random endpoint is uncached
  /** APOD date range from archive → 24 hours (historical, never changes) */
  APOD_RANGE: 24 * 60 * 60, // 24h

  /** NEO feed updates as new observations arrive → 15 minutes */
  NEO_FEED: 15 * 60, // 15m
  /** Individual asteroid lookup → 1 hour */
  NEO_LOOKUP: 60 * 60, // 1h

  /** Close approach data updates ~every 6 hours → 30 minutes */
  CNEOS_CAD: 30 * 60, // 30m
  /** Sentry impact monitoring updates ~daily → 1 hour */
  CNEOS_SENTRY_LIST: 60 * 60, // 1h
  /** Sentry single object detail → 1 hour */
  CNEOS_SENTRY_DETAIL: 60 * 60, // 1h
  /** Fireball data is historical, very stable → 2 hours */
  CNEOS_FIREBALL: 2 * 60 * 60, // 2h

  /** DONKI CME events update ~hourly → 15 minutes */
  DONKI_CME: 15 * 60, // 15m
  /** DONKI Solar flares update ~hourly → 15 minutes */
  DONKI_FLR: 15 * 60, // 15m
  /** DONKI Geomagnetic storms update ~hourly → 15 minutes */
  DONKI_GST: 15 * 60, // 15m
  /** DONKI notifications are near-real-time → 5 minutes (critical space weather alerts) */
  DONKI_NOTIFICATIONS: 5 * 60, // 5m

  /** EPIC imagery updates ~daily → 30 minutes */
  EPIC_IMAGES: 30 * 60, // 30m
  /** EPIC available dates → 6 hours */
  EPIC_DATES: 6 * 60 * 60, // 6h

  /** NASA Media search results → 10 minutes (query-dependent) */
  MEDIA_SEARCH: 10 * 60, // 10m
  /** NASA Media asset details → 1 hour (static archive) */
  MEDIA_ASSET: 60 * 60, // 1h

  /** Risk engine computations are deterministic → 30 minutes */
  RISK_ANALYSIS: 30 * 60, // 30m
} as const;

/** Redis key prefixes for each cacheable data source. */
export const CachePrefix = {
  APOD: 'apod',
  NEO_FEED: 'neo:feed',
  NEO_LOOKUP: 'neo:lookup',
  CNEOS_CAD: 'cneos:cad',
  CNEOS_SENTRY: 'cneos:sentry',
  CNEOS_SENTRY_DETAIL: 'cneos:sentry:detail',
  CNEOS_FIREBALL: 'cneos:fireball',
  DONKI_CME: 'donki:cme',
  DONKI_FLR: 'donki:flr',
  DONKI_GST: 'donki:gst',
  DONKI_NOTIFICATIONS: 'donki:notif',
  EPIC: 'epic',
  EPIC_DATES: 'epic:dates',
  MEDIA_SEARCH: 'media:search',
  MEDIA_ASSET: 'media:asset',
  RISK: 'risk',
} as const;
