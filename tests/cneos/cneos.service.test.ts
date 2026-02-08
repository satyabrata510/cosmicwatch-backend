//  CNEOS Service — Unit Tests
//  Tests data transformation logic with mocked axios

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Redis cache to always miss (pass-through to fetcher)
vi.mock('../../src/config/redis.config', () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    scan: vi.fn().mockResolvedValue(['0', []]),
  }),
  CacheTTL: {
    CNEOS_CAD: 1800,
    CNEOS_SENTRY_LIST: 3600,
    CNEOS_SENTRY_DETAIL: 3600,
    CNEOS_FIREBALL: 7200,
  },
  CachePrefix: {
    CNEOS_CAD: 'cneos:cad',
    CNEOS_SENTRY: 'cneos:sentry',
    CNEOS_SENTRY_DETAIL: 'cneos:sentry:detail',
    CNEOS_FIREBALL: 'cneos:fireball',
  },
}));

// Mock axios
vi.mock('axios', () => {
  const mockGet = vi.fn();
  return {
    default: {
      create: () => ({ get: mockGet }),
    },
    __mockGet: mockGet,
  };
});

import { CneosService } from '../../src/modules/cneos/cneos.service';

// Get the mock function
let mockGet: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  const axios = await import('axios');
  mockGet = (axios as any).__mockGet;
  vi.clearAllMocks();
});

describe('CneosService', () => {
  describe('getCloseApproaches()', () => {
    it('should parse CAD response and transform data', async () => {
      mockGet.mockResolvedValue({
        data: {
          signature: { version: '1.0', source: 'NASA' },
          count: 1,
          fields: [
            'des',
            'orbit_id',
            'jd',
            'cd',
            'dist',
            'dist_min',
            'dist_max',
            'v_rel',
            'v_inf',
            't_sigma_f',
            'h',
            'diameter',
            'diameter_sigma',
            'fullname',
          ],
          data: [
            [
              '2024 AA',
              '1',
              '2460000.5',
              '2025-Jan-01 00:00',
              '0.05',
              '0.04',
              '0.06',
              '10.5',
              '9.8',
              '< 00:01',
              '22.5',
              '0.1',
              '0.01',
              '  2024 AA  ',
            ],
          ],
        },
      });

      const result = await CneosService.getCloseApproaches();

      expect(result.totalCount).toBe(1);
      expect(result.approaches).toHaveLength(1);

      const approach = result.approaches[0];
      expect(approach.designation).toBe('2024 AA');
      expect(approach.orbitId).toBe('1');
      expect(approach.distanceAu).toBeCloseTo(0.05);
      expect(approach.distanceKm).toBeGreaterThan(0);
      expect(approach.distanceLunar).toBeGreaterThan(0);
      expect(approach.velocityRelative).toBeCloseTo(10.5);
      expect(approach.absoluteMagnitude).toBeCloseTo(22.5);
      expect(approach.diameter).toBeCloseTo(0.1);
      expect(approach.diameterSigma).toBeCloseTo(0.01);
      expect(approach.fullname).toBe('2024 AA');
    });

    it('should handle empty CAD response', async () => {
      mockGet.mockResolvedValue({
        data: { signature: {}, count: 0, fields: [], data: [] },
      });

      const result = await CneosService.getCloseApproaches();

      expect(result.totalCount).toBe(0);
      expect(result.approaches).toHaveLength(0);
    });

    it('should pass query options to API', async () => {
      mockGet.mockResolvedValue({
        data: { signature: {}, count: 0, fields: [], data: null },
      });

      await CneosService.getCloseApproaches({
        dateMin: '2025-01-01',
        dateMax: '2025-06-01',
        distMax: '5LD',
        sort: 'date',
        limit: 10,
        pha: true,
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/cad.api',
        expect.objectContaining({
          params: expect.objectContaining({
            'date-min': '2025-01-01',
            'date-max': '2025-06-01',
            'dist-max': '5LD',
            sort: 'date',
            limit: 10,
            pha: true,
          }),
        })
      );
    });

    it('should handle null h/diameter/diameter_sigma fields', async () => {
      mockGet.mockResolvedValue({
        data: {
          count: 1,
          fields: [
            'des',
            'orbit_id',
            'jd',
            'cd',
            'dist',
            'dist_min',
            'dist_max',
            'v_rel',
            'v_inf',
            't_sigma_f',
            'h',
            'diameter',
            'diameter_sigma',
            'fullname',
          ],
          data: [
            [
              '2024 BB',
              '2',
              '2460000.5',
              '2025-Feb-01',
              '0.1',
              '0.09',
              '0.11',
              '5.0',
              '4.5',
              '< 00:02',
              null,
              null,
              null,
              null,
            ],
          ],
        },
      });

      const result = await CneosService.getCloseApproaches();
      const approach = result.approaches[0];

      expect(approach.absoluteMagnitude).toBeNull();
      expect(approach.diameter).toBeNull();
      expect(approach.diameterSigma).toBeNull();
      expect(approach.fullname).toBeNull();
    });

    it('should handle empty string CAD fields falling back to defaults', async () => {
      mockGet.mockResolvedValue({
        data: {
          count: 1,
          fields: [
            'des',
            'orbit_id',
            'jd',
            'cd',
            'dist',
            'dist_min',
            'dist_max',
            'v_rel',
            'v_inf',
            't_sigma_f',
            'h',
            'diameter',
            'diameter_sigma',
            'fullname',
          ],
          data: [['', '', '', '', '0.05', '0.04', '0.06', '10', '9', '', null, null, null, '  ']],
        },
      });

      const result = await CneosService.getCloseApproaches();
      const approach = result.approaches[0];

      expect(approach.designation).toBe('');
      expect(approach.orbitId).toBe('');
      expect(approach.uncertaintyTime).toBe('');
      expect(approach.fullname).toBeNull();
    });
  });

  describe('getSentryList()', () => {
    it('should transform sentry summary data', async () => {
      mockGet.mockResolvedValue({
        data: {
          signature: {},
          count: 1,
          data: [
            {
              des: '99942',
              fullname: '99942 Apophis',
              h: '19.7',
              diameter: '0.37',
              n_imp: '47',
              ip: '2.7e-06',
              ps_cum: '-3.48',
              ps_max: '-4.17',
              ts_max: '0',
              range: '2068-2116',
              last_obs: '2021-03-09',
              last_obs_jd: '2459282.5',
              v_inf: '5.87',
              id: '99942',
            },
          ],
        },
      });

      const result = await CneosService.getSentryList();

      expect(result.totalCount).toBe(1);
      expect(result.objects).toHaveLength(1);

      const obj = result.objects[0];
      expect(obj.designation).toBe('99942');
      expect(obj.fullname).toBe('99942 Apophis');
      expect(obj.absoluteMagnitude).toBeCloseTo(19.7);
      expect(obj.diameter).toBeCloseTo(0.37);
      expect(obj.impactCount).toBe(47);
      expect(obj.torinoMax).toBe(0);
      expect(obj.impactDateRange).toBe('2068-2116');
    });

    it('should handle null diameter', async () => {
      mockGet.mockResolvedValue({
        data: {
          count: 1,
          data: [
            {
              des: 'X',
              fullname: 'X',
              h: '25',
              diameter: '',
              n_imp: '1',
              ip: '0.01',
              ps_cum: '-1',
              ps_max: '-1',
              ts_max: '0',
              range: '2030',
              last_obs: '2025-01-01',
              last_obs_jd: '1',
              v_inf: '10',
              id: 'X',
            },
          ],
        },
      });

      const result = await CneosService.getSentryList();
      expect(result.objects[0].diameter).toBeNull();
    });

    it('should pass filter options', async () => {
      mockGet.mockResolvedValue({ data: { count: 0, data: [] } });

      await CneosService.getSentryList({ psMin: -3, ipMin: 1e-7, hMax: 22, days: 365 });

      expect(mockGet).toHaveBeenCalledWith(
        '/sentry.api',
        expect.objectContaining({
          params: { 'ps-min': -3, 'ip-min': 1e-7, 'h-max': 22, days: 365 },
        })
      );
    });
  });

  describe('getSentryDetail()', () => {
    it('should transform sentry detail data', async () => {
      mockGet.mockResolvedValue({
        data: {
          signature: {},
          summary: {
            des: '99942',
            fullname: '99942 Apophis',
            method: 'Monte Carlo',
            h: '19.7',
            diameter: '0.37',
            mass: '6.1e10',
            energy: '1200',
            v_inf: '5.87',
            v_imp: '12.6',
            ip: '2.7e-06',
            n_imp: '47',
            ps_cum: '-3.48',
            ps_max: '-4.17',
            ts_max: '0',
            first_obs: '2004-03-15',
            last_obs: '2021-03-09',
            darc: '6200 days',
            nobs: '1915',
            ndel: '',
            ndop: '',
            nsat: '',
            pdate: '',
            cdate: '',
          },
          data: [
            {
              date: '2068-04-12',
              energy: '1200',
              ip: '7.1e-07',
              ps: '-5.42',
              ts: '0',
            },
          ],
        },
      });

      const result = await CneosService.getSentryDetail('99942');

      expect(result.designation).toBe('99942');
      expect(result.method).toBe('Monte Carlo');
      expect(result.mass).toBeCloseTo(6.1e10);
      expect(result.impactEnergy).toBeCloseTo(1200);
      expect(result.totalObservations).toBe(1915);
      expect(result.virtualImpactors).toHaveLength(1);
      expect(result.virtualImpactors[0].impactEnergy).toBeCloseTo(1200);
    });

    it('should handle null optional fields in summary', async () => {
      mockGet.mockResolvedValue({
        data: {
          summary: {
            des: 'X',
            fullname: 'X',
            method: 'Linlof',
            h: '25',
            diameter: '',
            mass: '',
            energy: '',
            v_inf: '10',
            v_imp: '12',
            ip: '0.01',
            n_imp: '1',
            ps_cum: '-1',
            ps_max: '-1',
            ts_max: '0',
            first_obs: '2025-01',
            last_obs: '2025-01',
            darc: '1',
            nobs: '10',
            ndel: '',
            ndop: '',
            nsat: '',
            pdate: '',
            cdate: '',
          },
          data: [{ date: '2030', energy: '', ip: '0.01', ps: '-1', ts: '0' }],
        },
      });

      const result = await CneosService.getSentryDetail('X');
      expect(result.diameter).toBeNull();
      expect(result.mass).toBeNull();
      expect(result.impactEnergy).toBeNull();
      expect(result.virtualImpactors[0].impactEnergy).toBeNull();
    });

    it('should throw on API error response', async () => {
      mockGet.mockResolvedValue({
        data: { error: 'Object not found' },
      });

      await expect(CneosService.getSentryDetail('INVALID')).rejects.toThrow('Object not found');
    });
  });

  describe('getFireballs()', () => {
    it('should parse fireball data with location', async () => {
      mockGet.mockResolvedValue({
        data: {
          count: 1,
          fields: ['date', 'lat', 'lat-dir', 'lon', 'lon-dir', 'alt', 'vel', 'energy', 'impact-e'],
          data: [
            ['2025-01-01 12:00:00', '30.5', 'N', '45.2', 'E', '25.0', '15.0', '1.5e10', '0.5'],
          ],
        },
      });

      const result = await CneosService.getFireballs();

      expect(result.totalCount).toBe(1);
      expect(result.fireballs).toHaveLength(1);

      const fb = result.fireballs[0];
      expect(fb.latitude).toBeCloseTo(30.5);
      expect(fb.latitudeDirection).toBe('N');
      expect(fb.longitude).toBeCloseTo(45.2);
      expect(fb.location).toBe('30.5°N, 45.2°E');
      expect(fb.altitude).toBeCloseTo(25.0);
      expect(fb.velocity).toBeCloseTo(15.0);
    });

    it('should handle fireball with no location', async () => {
      mockGet.mockResolvedValue({
        data: {
          count: 1,
          fields: ['date', 'lat', 'lat-dir', 'lon', 'lon-dir', 'alt', 'vel', 'energy', 'impact-e'],
          data: [['2025-01-01 12:00:00', null, null, null, null, null, null, '1e9', '0.1']],
        },
      });

      const result = await CneosService.getFireballs();
      const fb = result.fireballs[0];

      expect(fb.latitude).toBeNull();
      expect(fb.longitude).toBeNull();
      expect(fb.location).toBeNull();
      expect(fb.altitude).toBeNull();
      expect(fb.velocity).toBeNull();
    });

    it('should handle fireball with coords but no direction labels', async () => {
      mockGet.mockResolvedValue({
        data: {
          count: 1,
          fields: ['date', 'lat', 'lat-dir', 'lon', 'lon-dir', 'alt', 'vel', 'energy', 'impact-e'],
          data: [['2025-06-15 08:00:00', '10.0', null, '20.0', null, '30', '12', '5e9', '0.3']],
        },
      });

      const result = await CneosService.getFireballs();
      const fb = result.fireballs[0];

      expect(fb.latitude).toBeCloseTo(10.0);
      expect(fb.longitude).toBeCloseTo(20.0);
      expect(fb.location).toBe('10°, 20°');
    });

    it('should handle empty fireball response', async () => {
      mockGet.mockResolvedValue({
        data: { count: 0, fields: [], data: null },
      });

      const result = await CneosService.getFireballs();
      expect(result.fireballs).toHaveLength(0);
    });

    it('should pass fireball filter options', async () => {
      mockGet.mockResolvedValue({
        data: { count: 0, fields: [], data: null },
      });

      await CneosService.getFireballs({
        dateMin: '2024-01-01',
        dateMax: '2025-01-01',
        limit: 5,
        sort: '-energy',
        energyMin: 1.0,
        reqLoc: true,
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/fireball.api',
        expect.objectContaining({
          params: expect.objectContaining({
            'date-min': '2024-01-01',
            'date-max': '2025-01-01',
            limit: 5,
            sort: '-energy',
            'impact-e-min': 1.0,
            'req-loc': true,
          }),
        })
      );
    });
  });
});
