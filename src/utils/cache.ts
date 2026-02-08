import { createHash } from 'node:crypto';
import { getRedis } from '../config/redis.config';
import { logger } from './logger';

const cacheLogger = logger.child({ module: 'cache' });

/**
 * In-flight fetch map — prevents thundering-herd / cache-stampede.
 * When multiple concurrent requests miss the same key, only ONE fetcher
 * fires; all others await the same promise.
 */
const inflight = new Map<string, Promise<unknown>>();

/**
 * Generate a deterministic cache key from a prefix and optional params.
 * Uses an MD5 hash of sorted params to keep keys short and safe.
 */
export function cacheKey(prefix: string, params?: Record<string, unknown> | string): string {
  if (!params) return prefix;
  const raw =
    typeof params === 'string' ? params : JSON.stringify(params, Object.keys(params).sort());
  const hash = createHash('md5').update(raw).digest('hex').slice(0, 12);
  return `${prefix}:${hash}`;
}

/**
 * Cache-aside (read-through) pattern with singleflight coalescing.
 *
 * 1. Check Redis for cached value
 * 2. If cache HIT → return parsed JSON (skip NASA API call)
 * 3. If cache MISS → coalesce concurrent requests so only ONE calls `fetcher()`
 * 4. Store result in Redis with TTL, return to all waiters
 *
 * If Redis is unavailable, silently falls back to direct fetch.
 *
 * @param key    - Full cache key (use `cacheKey()` helper)
 * @param ttl    - Time-to-live in seconds
 * @param fetcher - Async function that calls the actual NASA API
 */
export async function getOrSet<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const redis = getRedis();

  // 1. Try Redis
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      cacheLogger.debug({ key, source: 'redis' }, 'Cache HIT');
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    cacheLogger.warn({ err, key }, 'Redis GET failed — falling back to API');
  }

  // 2. Singleflight — join an existing in-flight fetch if one is running
  const existing = inflight.get(key);
  if (existing) {
    cacheLogger.debug({ key }, 'Joining in-flight fetch (singleflight)');
    return existing as Promise<T>;
  }

  // 3. Cache MISS — launch the fetch and register it
  cacheLogger.debug({ key, source: 'api' }, 'Cache MISS');

  const promise = (async () => {
    const data = await fetcher();
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
      cacheLogger.debug({ key, ttl }, 'Cached in Redis');
    } catch (err) {
      cacheLogger.warn({ err, key }, 'Redis SETEX failed — response served but not cached');
    }
    return data;
  })();

  inflight.set(key, promise);

  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/**
 * Invalidate a specific cache key or a pattern of keys.
 */
export async function invalidateCache(pattern: string): Promise<number> {
  const redis = getRedis();
  try {
    // If pattern contains *, use SCAN + DEL
    if (pattern.includes('*')) {
      let cursor = '0';
      let deletedCount = 0;
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');
      cacheLogger.info({ pattern, deleted: deletedCount }, 'Cache invalidated (pattern)');
      return deletedCount;
    }
    // Single key
    const result = await redis.del(pattern);
    cacheLogger.info({ key: pattern, deleted: result }, 'Cache invalidated');
    return result;
  } catch (err) {
    cacheLogger.warn({ err, pattern }, 'Cache invalidation failed');
    return 0;
  }
}
