//  NEO API — Integration Tests
//  Feed, Lookup, Risk Analysis, Sentry Risk

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { API, request } from '../helpers';

const today = () => new Date().toISOString().slice(0, 10);

/** Mock the Socket.IO risk-engine connection so bootstrap doesn't block. */
vi.mock('../../src/websocket/risk-engine.socket', () => ({
  connectRiskEngineSocket: vi.fn().mockResolvedValue(undefined),
  disconnectRiskEngineSocket: vi.fn(),
  isRiskEngineConnected: vi.fn().mockReturnValue(true),
}));

/**
 * Whether the Python risk engine is actually reachable.
 * Risk-dependent integration tests are skipped when it's offline.
 */
let riskEngineAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2000) });
    riskEngineAvailable = res.ok;
  } catch {
    riskEngineAvailable = false;
  }
});

// Feed & Lookup ──────────────────────────────────────────
describe('NEO API', () => {
  describe('GET /neo/feed', () => {
    it('should return NEO feed for date range', async () => {
      const res = await request
        .get(`${API}/neo/feed`)
        .query({ start_date: today(), end_date: today() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.element_count).toBeTypeOf('number');
      expect(res.body.data.near_earth_objects).toBeDefined();
    });

    it('should default to today when no dates provided', async () => {
      const res = await request.get(`${API}/neo/feed`);

      expect(res.status).toBe(200);
      expect(res.body.data.near_earth_objects).toBeDefined();
    });
  });

  describe('GET /neo/lookup/:asteroidId', () => {
    it('should return asteroid details for known asteroid', async () => {
      const res = await request.get(`${API}/neo/lookup/2099942`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.id).toBeDefined();
    });
  });

  // Risk Analysis — requires Python risk engine running
  describe('GET /neo/risk', () => {
    it.skipIf(!riskEngineAvailable)('should return risk analysis for date range', async () => {
      const res = await request
        .get(`${API}/neo/risk`)
        .query({ start_date: today(), end_date: today() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /neo/lookup/:asteroidId/risk', () => {
    it.skipIf(!riskEngineAvailable)(
      'should return risk analysis for a specific asteroid',
      async () => {
        const res = await request.get(`${API}/neo/lookup/2099942/risk`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      }
    );
  });

  describe('GET /neo/lookup/:asteroidId/sentry-risk', () => {
    it.skipIf(!riskEngineAvailable)(
      'should return sentry risk data for a known Sentry object',
      async () => {
        const res = await request.get(`${API}/neo/lookup/2099942/sentry-risk`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      }
    );

    it.skipIf(!riskEngineAvailable)('should handle non-Sentry asteroid gracefully', async () => {
      const res = await request.get(`${API}/neo/lookup/3542519/sentry-risk`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
