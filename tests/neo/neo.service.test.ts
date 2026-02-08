//  NEO Service — Unit Tests
//  Tests feed, lookup, risk analysis with mocked deps

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Redis — always cache miss
vi.mock('../../src/config/redis.config', () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  }),
  CacheTTL: {
    NEO_FEED: 900,
    NEO_LOOKUP: 3600,
    RISK_ANALYSIS: 1800,
  },
  CachePrefix: {
    NEO_FEED: 'neo:feed',
    NEO_LOOKUP: 'neo:lookup',
    RISK: 'risk',
  },
}));

// Hoisted mocks — must be declared before vi.mock
const { mockPrisma, mockNasaGet, mockRiskPost, mockConnectSocket } = vi.hoisted(() => ({
  mockPrisma: {
    cachedAsteroid: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
  mockNasaGet: vi.fn(),
  mockRiskPost: vi.fn(),
  mockConnectSocket: vi.fn(),
}));

vi.mock('../../src/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config')>();
  return {
    ...actual,
    prisma: mockPrisma,
  };
});

vi.mock('axios', () => ({
  default: {
    create: (config: any) => {
      if (config?.headers?.['Content-Type'] === 'application/json') {
        return { post: mockRiskPost };
      }
      return { get: mockNasaGet };
    },
  },
}));

vi.mock('../../src/websocket', () => ({
  connectRiskEngineSocket: (...args: unknown[]) => mockConnectSocket(...args),
}));

import { NeoService } from '../../src/modules/neo/neo.service';

beforeEach(() => {
  vi.clearAllMocks();
});

const SAMPLE_ASTEROID: any = {
  neo_reference_id: '12345',
  name: '(2024 XY)',
  absolute_magnitude_h: 22.5,
  is_potentially_hazardous_asteroid: true,
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: 0.1,
      estimated_diameter_max: 0.3,
    },
  },
  close_approach_data: [
    {
      close_approach_date: '2025-01-01',
      close_approach_date_full: '2025-Jan-01 12:00',
      epoch_date_close_approach: 1735732800000,
      relative_velocity: {
        kilometers_per_second: '10.5',
        kilometers_per_hour: '37800',
        miles_per_hour: '23485',
      },
      miss_distance: {
        astronomical: '0.05',
        lunar: '19.45',
        kilometers: '7479893',
        miles: '4648210',
      },
      orbiting_body: 'Earth',
    },
  ],
};

describe('NeoService', () => {
  describe('getFeed()', () => {
    it('should fetch and return NEO feed', async () => {
      const feedResponse = {
        element_count: 1,
        near_earth_objects: {
          '2025-01-01': [SAMPLE_ASTEROID],
        },
      };
      mockNasaGet.mockResolvedValue({ data: feedResponse });

      const result = await NeoService.getFeed('2025-01-01', '2025-01-01');

      expect(result.near_earth_objects['2025-01-01']).toHaveLength(1);
      expect(mockNasaGet).toHaveBeenCalledWith(
        '/feed',
        expect.objectContaining({
          params: { start_date: '2025-01-01', end_date: '2025-01-01' },
        })
      );
    });

    it('should cache asteroids after fetch', async () => {
      mockNasaGet.mockResolvedValue({
        data: {
          element_count: 1,
          near_earth_objects: { '2025-01-01': [SAMPLE_ASTEROID] },
        },
      });

      await NeoService.getFeed('2025-01-01', '2025-01-01');

      // Wait for background cacheAsteroids
      await new Promise((r) => setTimeout(r, 100));

      expect(mockPrisma.cachedAsteroid.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { neoReferenceId: '12345' },
        })
      );
    });
  });

  describe('lookup()', () => {
    it('should fetch from NASA when not in DB cache', async () => {
      mockPrisma.cachedAsteroid.findUnique.mockResolvedValue(null);
      mockNasaGet.mockResolvedValue({ data: SAMPLE_ASTEROID });

      const result = await NeoService.lookup('12345');

      expect(result.neo_reference_id).toBe('12345');
      expect(mockNasaGet).toHaveBeenCalledWith('/neo/12345');
      expect(mockPrisma.cachedAsteroid.upsert).toHaveBeenCalled();
    });

    it('should return DB-cached data if fresh', async () => {
      mockPrisma.cachedAsteroid.findUnique.mockResolvedValue({
        neoReferenceId: '12345',
        dataJson: SAMPLE_ASTEROID,
        lastFetchedAt: new Date(), // Fresh
      });

      const result = await NeoService.lookup('12345');

      expect(result.neo_reference_id).toBe('12345');
      expect(mockNasaGet).not.toHaveBeenCalled();
    });

    it('should fetch from NASA when DB cache is stale', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      mockPrisma.cachedAsteroid.findUnique.mockResolvedValue({
        neoReferenceId: '12345',
        dataJson: SAMPLE_ASTEROID,
        lastFetchedAt: twoHoursAgo, // Stale (>60 min)
      });
      mockNasaGet.mockResolvedValue({ data: SAMPLE_ASTEROID });

      await NeoService.lookup('12345');

      expect(mockNasaGet).toHaveBeenCalledWith('/neo/12345');
    });
  });

  describe('analyzeRiskEnhanced()', () => {
    it('should send asteroids to risk engine', async () => {
      const riskResult = {
        totalAnalyzed: 1,
        dateRange: { start: '2025-01-01', end: '2025-01-07' },
        statistics: { maxRiskScore: 75 },
        assessments: [],
      };
      mockRiskPost.mockResolvedValue({ data: riskResult });

      const result = await NeoService.analyzeRiskEnhanced([SAMPLE_ASTEROID], {
        start: '2025-01-01',
        end: '2025-01-07',
      });

      expect(result.totalAnalyzed).toBe(1);
      expect(mockRiskPost).toHaveBeenCalledWith(
        '/api/v1/analyze',
        expect.objectContaining({
          asteroids: [SAMPLE_ASTEROID],
          date_range: { start: '2025-01-01', end: '2025-01-07' },
        })
      );
    });
  });

  describe('analyzeRiskSingle()', () => {
    it('should send single asteroid to risk engine', async () => {
      const singleResult = { risk_score: 42 };
      mockRiskPost.mockResolvedValue({ data: singleResult });

      const result = await NeoService.analyzeRiskSingle(SAMPLE_ASTEROID);

      expect(result.risk_score).toBe(42);
      expect(mockRiskPost).toHaveBeenCalledWith('/api/v1/analyze/single', SAMPLE_ASTEROID);
    });
  });

  describe('analyzeRiskSentryEnhanced()', () => {
    it('should send asteroid + sentry data to risk engine', async () => {
      const sentryResult = { risk_score: 85, sentry_enhanced: true };
      mockRiskPost.mockResolvedValue({ data: sentryResult });

      const sentryData = {
        designation: '99942',
        cumulativeImpactProbability: 2.7e-6,
        palermoCumulative: -3.48,
        palermoMax: -4.17,
        torinoMax: 0,
        impactEnergy: 1200,
        diameter: 0.37,
        mass: 6.1e10,
        velocityImpact: 12.6,
        velocityInfinity: 5.87,
        totalVirtualImpactors: 47,
        virtualImpactors: [],
      };

      const result = await NeoService.analyzeRiskSentryEnhanced(SAMPLE_ASTEROID, sentryData);

      expect(result.sentry_enhanced).toBe(true);
      expect(mockRiskPost).toHaveBeenCalledWith(
        '/api/v1/analyze/sentry-enhanced',
        expect.objectContaining({
          asteroid: SAMPLE_ASTEROID,
          sentry_data: expect.objectContaining({
            designation: '99942',
            cumulative_impact_probability: 2.7e-6,
          }),
        })
      );
    });
  });

  describe('connectRiskEngine()', () => {
    it('should succeed when Socket.IO connects to risk engine', async () => {
      mockConnectSocket.mockResolvedValue(undefined);

      await expect(NeoService.connectRiskEngine()).resolves.toBeUndefined();
      expect(mockConnectSocket).toHaveBeenCalledOnce();
    });

    it('should throw when Socket.IO connection fails', async () => {
      mockConnectSocket.mockRejectedValue(
        new Error('Risk engine unreachable — Socket.IO connection timed out')
      );

      await expect(NeoService.connectRiskEngine()).rejects.toThrow('Risk engine unreachable');
    });
  });
});
