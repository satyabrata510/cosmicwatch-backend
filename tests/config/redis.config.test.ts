import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('redis.config', () => {
  const mockConnect = vi.fn();
  const mockQuit = vi.fn();
  const mockOn = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockConnect.mockReset();
    mockQuit.mockReset();
    mockOn.mockReset();

    vi.doMock('ioredis', () => {
      // Must be a regular function (not arrow) so it can be called with `new`
      const MockRedis = vi.fn(function (this: any) {
        this.connect = mockConnect;
        this.quit = mockQuit;
        this.on = mockOn;
        return this;
      });
      return { default: MockRedis };
    });

    vi.doMock('../../src/utils/logger', () => ({
      logger: {
        child: vi.fn(() => ({
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          fatal: vi.fn(),
        })),
      },
    }));
  });

  it('getRedis creates a Redis instance and registers event handlers', async () => {
    const { getRedis } = await import('../../src/config/redis.config');
    const client = getRedis();

    expect(client).toBeDefined();
    expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('getRedis returns the same instance on subsequent calls', async () => {
    const { getRedis } = await import('../../src/config/redis.config');
    const client1 = getRedis();
    const client2 = getRedis();
    expect(client1).toBe(client2);
  });

  it('retryStrategy returns a capped delay', async () => {
    const { getRedis } = await import('../../src/config/redis.config');
    getRedis();

    const Redis = (await import('ioredis')).default;
    const options = (vi.mocked(Redis).mock.calls[0] as unknown[])[1] as any;

    expect(options.retryStrategy(1)).toBe(200);
    expect(options.retryStrategy(10)).toBe(2000);
    expect(options.retryStrategy(100)).toBe(5000); // capped at 5000
  });

  it('event handlers execute without errors', async () => {
    const { getRedis } = await import('../../src/config/redis.config');
    getRedis();

    const onCalls = mockOn.mock.calls as [string, (...args: any[]) => void][];
    for (const [event, handler] of onCalls) {
      if (event === 'error') {
        handler(new Error('test error'));
      } else {
        handler();
      }
    }
    // Verify all 4 event handlers were registered and called
    expect(onCalls).toHaveLength(4);
  });

  it('connectRedis connects successfully', async () => {
    mockConnect.mockResolvedValueOnce(undefined);
    const { connectRedis } = await import('../../src/config/redis.config');
    await connectRedis();
    expect(mockConnect).toHaveBeenCalled();
  });

  it('connectRedis handles connection failure gracefully (non-fatal)', async () => {
    mockConnect.mockRejectedValueOnce(new Error('connection refused'));
    const { connectRedis } = await import('../../src/config/redis.config');
    // Should not throw — error is caught and logged
    await expect(connectRedis()).resolves.not.toThrow();
  });

  it('disconnectRedis quits and resets the instance', async () => {
    mockQuit.mockResolvedValueOnce('OK');
    const { getRedis, disconnectRedis } = await import('../../src/config/redis.config');
    getRedis(); // Initialize instance
    await disconnectRedis();
    expect(mockQuit).toHaveBeenCalled();
  });

  it('disconnectRedis is a no-op when redis is null', async () => {
    const { disconnectRedis } = await import('../../src/config/redis.config');
    // redis is null initially (no getRedis call)
    await disconnectRedis();
    expect(mockQuit).not.toHaveBeenCalled();
  });
});
