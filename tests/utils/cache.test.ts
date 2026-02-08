//  Cache Utilities — Unit Tests

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheKey, getOrSet, invalidateCache } from '../../src/utils/cache';

// Mock the redis module
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
};

vi.mock('../../src/config/redis.config', () => ({
  getRedis: () => mockRedis,
}));

describe('Cache Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // cacheKey ─────────────────────────────────────────────
  describe('cacheKey()', () => {
    it('should return prefix alone when no params', () => {
      expect(cacheKey('test')).toBe('test');
    });

    it('should append hash for object params', () => {
      const key = cacheKey('neo:feed', { start: '2025-01-01', end: '2025-01-07' });
      expect(key).toMatch(/^neo:feed:[a-f0-9]{12}$/);
    });

    it('should append hash for string params', () => {
      const key = cacheKey('neo:lookup', '12345');
      expect(key).toMatch(/^neo:lookup:[a-f0-9]{12}$/);
    });

    it('should produce deterministic keys', () => {
      const key1 = cacheKey('prefix', { a: 1, b: 2 });
      const key2 = cacheKey('prefix', { a: 1, b: 2 });
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different params', () => {
      const key1 = cacheKey('prefix', { a: 1 });
      const key2 = cacheKey('prefix', { a: 2 });
      expect(key1).not.toBe(key2);
    });
  });

  // getOrSet ─────────────────────────────────────────────
  describe('getOrSet()', () => {
    it('should return cached value on cache HIT', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ data: 'cached' }));
      const fetcher = vi.fn();

      const result = await getOrSet('key', 300, fetcher);

      expect(result).toEqual({ data: 'cached' });
      expect(fetcher).not.toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('key');
    });

    it('should call fetcher and cache on cache MISS', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await getOrSet('key', 600, fetcher);

      expect(result).toEqual({ data: 'fresh' });
      expect(fetcher).toHaveBeenCalledOnce();
      expect(mockRedis.setex).toHaveBeenCalledWith('key', 600, JSON.stringify({ data: 'fresh' }));
    });

    it('should fallback to fetcher when Redis GET fails', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis down'));
      mockRedis.setex.mockResolvedValue('OK');
      const fetcher = vi.fn().mockResolvedValue({ data: 'fallback' });

      const result = await getOrSet('key', 300, fetcher);

      expect(result).toEqual({ data: 'fallback' });
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it('should return data even when Redis SETEX fails', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockRejectedValue(new Error('Redis write fail'));
      const fetcher = vi.fn().mockResolvedValue({ data: 'served' });

      const result = await getOrSet('key', 300, fetcher);

      expect(result).toEqual({ data: 'served' });
    });
  });

  // invalidateCache ──────────────────────────────────────
  describe('invalidateCache()', () => {
    it('should delete a single key', async () => {
      mockRedis.del.mockResolvedValue(1);

      const count = await invalidateCache('neo:feed:abc123');

      expect(count).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('neo:feed:abc123');
    });

    it('should use SCAN for wildcard pattern', async () => {
      // Simulate one SCAN iteration with keys, then done
      mockRedis.scan.mockResolvedValueOnce(['0', ['neo:feed:a', 'neo:feed:b']]);
      mockRedis.del.mockResolvedValue(2);

      const count = await invalidateCache('neo:feed:*');

      expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'neo:feed:*', 'COUNT', 100);
      expect(mockRedis.del).toHaveBeenCalledWith('neo:feed:a', 'neo:feed:b');
      expect(count).toBe(2);
    });

    it('should handle multi-page SCAN', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['42', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);
      mockRedis.del.mockResolvedValue(1);

      const count = await invalidateCache('prefix:*');

      expect(count).toBe(3);
      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
    });

    it('should handle empty SCAN results', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []]);

      const count = await invalidateCache('empty:*');

      expect(count).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should return 0 on Redis error', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      const count = await invalidateCache('some:key');

      expect(count).toBe(0);
    });
  });
});
