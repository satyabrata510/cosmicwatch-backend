//  Space Weather Service — Unit Tests

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/redis.config', () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  }),
  CacheTTL: { DONKI_CME: 900, DONKI_FLR: 900, DONKI_GST: 900, DONKI_NOTIFICATIONS: 300 },
  CachePrefix: {
    DONKI_CME: 'donki:cme',
    DONKI_FLR: 'donki:flr',
    DONKI_GST: 'donki:gst',
    DONKI_NOTIFICATIONS: 'donki:notif',
  },
}));

vi.mock('axios', () => {
  const mockGet = vi.fn();
  return {
    default: { create: () => ({ get: mockGet }) },
    __mockGet: mockGet,
  };
});

import { SpaceWeatherService } from '../../src/modules/space-weather/space-weather.service';

let mockGet: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  const axios = await import('axios');
  mockGet = (axios as any).__mockGet;
  vi.clearAllMocks();
});

describe('SpaceWeatherService', () => {
  describe('getCme()', () => {
    it('should transform CME events', async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            activityID: 'CME-001',
            catalog: 'M2M',
            startTime: '2025-01-01T12:00Z',
            sourceLocation: 'N15W30',
            activeRegionNum: 3100,
            link: 'https://example.com',
            note: 'Fast CME',
            instruments: [{ displayName: 'LASCO C2' }],
            linkedEvents: [{ activityID: 'FLR-001' }],
            cmeAnalyses: [
              {
                time21_5: null,
                latitude: 15,
                longitude: -30,
                halfAngle: 45,
                speed: 1500,
                type: 'S',
                isMostAccurate: true,
                note: '',
                levelOfData: 2,
                link: '',
                enlilList: [
                  {
                    modelCompletionTime: '2025-01-01T18:00Z',
                    au: 1.0,
                    estimatedShockArrivalTime: '2025-01-03T00:00Z',
                    estimatedDuration: 12,
                    rmin_re: null,
                    kp_18: 5,
                    kp_90: null,
                    kp_135: null,
                    kp_180: null,
                    isEarthGB: true,
                    link: '',
                    impactList: null,
                    cmeIDs: [],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await SpaceWeatherService.getCme('2025-01-01', '2025-01-31');

      expect(result.totalCount).toBe(1);
      expect(result.events[0].activityId).toBe('CME-001');
      expect(result.events[0].speed).toBe(1500);
      expect(result.events[0].earthDirected).toBe(true);
      expect(result.events[0].estimatedArrival).toBe('2025-01-03T00:00Z');
      expect(result.events[0].instruments).toEqual(['LASCO C2']);
      expect(result.events[0].linkedEvents).toEqual(['FLR-001']);
    });

    it('should handle CME without analysis data', async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            activityID: 'CME-002',
            catalog: 'M2M',
            startTime: '2025-01-01T12:00Z',
            sourceLocation: '',
            activeRegionNum: null,
            link: '',
            note: '',
            instruments: [],
            linkedEvents: null,
            cmeAnalyses: null,
          },
        ],
      });

      const result = await SpaceWeatherService.getCme();

      const event = result.events[0];
      expect(event.speed).toBeNull();
      expect(event.earthDirected).toBe(false);
      expect(event.estimatedArrival).toBeNull();
      expect(event.linkedEvents).toEqual([]);
    });

    it('should handle empty data array', async () => {
      mockGet.mockResolvedValue({ data: null });

      const result = await SpaceWeatherService.getCme();
      expect(result.totalCount).toBe(0);
    });

    it('should use non-most-accurate analysis as fallback', async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            activityID: 'CME-003',
            startTime: '2025-01-01',
            sourceLocation: '',
            activeRegionNum: null,
            link: '',
            note: '',
            instruments: [],
            cmeAnalyses: [
              {
                isMostAccurate: false,
                speed: 800,
                halfAngle: 30,
                latitude: 10,
                longitude: 20,
                type: 'C',
                enlilList: null,
                time21_5: null,
                note: '',
                levelOfData: 1,
                link: '',
              },
            ],
          },
        ],
      });

      const result = await SpaceWeatherService.getCme();
      expect(result.events[0].speed).toBe(800);
    });
  });

  describe('getSolarFlares()', () => {
    it('should transform flare events with classification', async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            flrID: 'FLR-X',
            instruments: [{ displayName: 'GOES-16' }],
            beginTime: '2025-01-01T10:00Z',
            peakTime: '2025-01-01T10:30Z',
            endTime: '2025-01-01T11:00Z',
            classType: 'X2.5',
            sourceLocation: 'S15E30',
            activeRegionNum: 3100,
            note: 'Major flare',
            link: 'https://example.com',
          },
          {
            flrID: 'FLR-M',
            instruments: [{ displayName: 'GOES-16' }],
            beginTime: '2025-01-02',
            peakTime: '2025-01-02',
            endTime: null,
            classType: 'M1.0',
            sourceLocation: '',
            activeRegionNum: null,
            note: '',
            link: '',
          },
          {
            flrID: 'FLR-C',
            instruments: [],
            beginTime: '2025-01-03',
            peakTime: '2025-01-03',
            endTime: null,
            classType: 'C3.2',
            sourceLocation: '',
            activeRegionNum: null,
            note: '',
            link: '',
          },
          {
            flrID: 'FLR-B',
            instruments: [],
            beginTime: '2025-01-04',
            peakTime: '2025-01-04',
            endTime: null,
            classType: 'B1.0',
            sourceLocation: '',
            activeRegionNum: null,
            note: '',
            link: '',
          },
        ],
      });

      const result = await SpaceWeatherService.getSolarFlares();

      expect(result.totalCount).toBe(4);
      expect(result.summary).toEqual({ xClass: 1, mClass: 1, cClass: 1, other: 1 });

      const xFlare = result.events[0];
      expect(xFlare.classCategory).toBe('X');
      expect(xFlare.intensity).toBeCloseTo(2.5);
    });

    it('should handle empty flare data', async () => {
      mockGet.mockResolvedValue({ data: null });

      const result = await SpaceWeatherService.getSolarFlares();
      expect(result.totalCount).toBe(0);
      expect(result.summary).toEqual({ xClass: 0, mClass: 0, cClass: 0, other: 0 });
    });

    it('should handle flare with null classType', async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            flrID: 'FLR-NULL',
            instruments: [],
            beginTime: '2025-01-05',
            peakTime: '2025-01-05',
            endTime: null,
            classType: null,
            sourceLocation: '',
            activeRegionNum: null,
            note: '',
            link: '',
          },
        ],
      });

      const result = await SpaceWeatherService.getSolarFlares();
      expect(result.events[0].classCategory).toBe('?');
      expect(result.events[0].intensity).toBe(0);
      expect(result.summary.other).toBe(1);
    });
  });

  describe('getGeomagneticStorms()', () => {
    it('should transform storms with KP classification', async () => {
      const testCases = [
        { kp: 9, expected: 'G5 — Extreme' },
        { kp: 8, expected: 'G4 — Severe' },
        { kp: 7, expected: 'G3 — Strong' },
        { kp: 6, expected: 'G2 — Moderate' },
        { kp: 5, expected: 'G1 — Minor' },
        { kp: 4, expected: 'Below storm threshold' },
      ];

      for (const tc of testCases) {
        mockGet.mockResolvedValue({
          data: [
            {
              gstID: `GST-${tc.kp}`,
              startTime: '2025-01-01',
              allKpIndex: [{ observedTime: '2025-01-01', kpIndex: tc.kp, source: 'NOAA' }],
              link: '',
            },
          ],
        });

        const result = await SpaceWeatherService.getGeomagneticStorms();
        expect(result.events[0].stormLevel).toBe(tc.expected);
        expect(result.events[0].maxKpIndex).toBe(tc.kp);
      }
    });

    it('should handle empty storm data', async () => {
      mockGet.mockResolvedValue({ data: null });

      const result = await SpaceWeatherService.getGeomagneticStorms();
      expect(result.totalCount).toBe(0);
    });

    it('should handle storm with null allKpIndex', async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            gstID: 'GST-NULL',
            startTime: '2025-01-01',
            allKpIndex: null,
            link: '',
          },
        ],
      });

      const result = await SpaceWeatherService.getGeomagneticStorms();
      expect(result.events[0].maxKpIndex).toBe(-Infinity);
      expect(result.events[0].kpReadings).toEqual([]);
    });
  });

  describe('getNotifications()', () => {
    it('should transform notification data', async () => {
      mockGet.mockResolvedValue({
        data: [
          {
            messageType: 'CME',
            messageID: 'MSG-001',
            messageURL: 'https://example.com',
            messageIssueTime: '2025-01-01T12:00Z',
            messageBody: 'CME observed',
          },
        ],
      });

      const result = await SpaceWeatherService.getNotifications('2025-01-01', '2025-01-31', 'CME');

      expect(result.totalCount).toBe(1);
      expect(result.notifications[0].messageType).toBe('CME');
      expect(result.notifications[0].messageId).toBe('MSG-001');
      expect(result.notifications[0].body).toBe('CME observed');
    });

    it('should handle empty notifications', async () => {
      mockGet.mockResolvedValue({ data: null });

      const result = await SpaceWeatherService.getNotifications();
      expect(result.totalCount).toBe(0);
    });

    it('should pass type filter when provided', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await SpaceWeatherService.getNotifications(undefined, undefined, 'FLR');

      expect(mockGet).toHaveBeenCalledWith(
        '/notifications',
        expect.objectContaining({
          params: expect.objectContaining({ type: 'FLR' }),
        })
      );
    });
  });
});
