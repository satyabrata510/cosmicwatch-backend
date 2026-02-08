import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('env.config validation', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    // Save all potentially affected env vars
    for (const key of ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'PORT']) {
      savedEnv[key] = process.env[key];
    }
    // Mock dotenv to prevent .env file from re-loading values
    vi.doMock('dotenv', () => ({
      default: { config: vi.fn() },
      config: vi.fn(),
    }));
  });

  afterEach(() => {
    // Restore all env vars
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('getEnvVar throws when a required variable is missing and has no fallback', async () => {
    delete process.env.DATABASE_URL;

    await expect(import('../../src/config/env.config')).rejects.toThrow(
      'Missing required environment variable: DATABASE_URL'
    );
  });

  it('getEnvNumber throws when env var is not a valid number', async () => {
    process.env.PORT = 'not-a-number';

    await expect(import('../../src/config/env.config')).rejects.toThrow('must be a valid number');
  });
});
