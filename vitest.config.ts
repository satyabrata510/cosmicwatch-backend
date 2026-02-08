import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      RATE_LIMIT_MAX_REQUESTS: '10000',
      RATE_LIMIT_AUTH_MAX_REQUESTS: '10000',
      RATE_LIMIT_NASA_MAX_REQUESTS: '10000',
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    sequence: { concurrent: false },
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/server.ts',
        'src/websocket/**',
        'src/utils/logger.ts',
        'src/**/index.ts',
        'src/**/*.types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
});
