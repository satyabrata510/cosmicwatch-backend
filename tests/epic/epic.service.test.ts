//  EPIC Service — Unit Tests

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/redis.config', () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  }),
  CacheTTL: { EPIC_IMAGES: 1800, EPIC_DATES: 21600 },
  CachePrefix: { EPIC: 'epic', EPIC_DATES: 'epic:dates' },
}));

vi.mock('axios', () => {
  const mockGet = vi.fn();
  return {
    default: { create: () => ({ get: mockGet }) },
    __mockGet: mockGet,
  };
});

import { EpicService } from '../../src/modules/epic/epic.service';

let mockGet: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  const axios = await import('axios');
  mockGet = (axios as any).__mockGet;
  vi.clearAllMocks();
});

const SAMPLE_IMAGE: any = {
  identifier: '20250101003634',
  caption: 'Earth image',
  image: 'epic_1b_20250101003634',
  version: '03',
  date: '2025-01-01 00:36:34',
  centroid_coordinates: { lat: 10.5, lon: -20.3 },
  dscovr_j2000_position: { x: 1, y: 2, z: 3 },
  lunar_j2000_position: { x: 4, y: 5, z: 6 },
  sun_j2000_position: { x: 7, y: 8, z: 9 },
  attitude_quaternions: { q0: 0, q1: 0, q2: 0, q3: 1 },
};

describe('EpicService', () => {
  describe('getNatural()', () => {
    it('should transform natural images with correct URL', async () => {
      mockGet.mockResolvedValue({ data: [SAMPLE_IMAGE] });

      const result = await EpicService.getNatural();

      expect(result.totalCount).toBe(1);
      expect(result.imageType).toBe('natural');

      const img = result.images[0];
      expect(img.identifier).toBe('20250101003634');
      expect(img.imageUrl).toBe(
        'https://epic.gsfc.nasa.gov/archive/natural/2025/01/01/png/epic_1b_20250101003634.png'
      );
      expect(img.centroidCoordinates).toEqual({ latitude: 10.5, longitude: -20.3 });
    });

    it('should use date endpoint when date provided', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await EpicService.getNatural('2025-01-15');

      expect(mockGet).toHaveBeenCalledWith('/api/natural/date/2025-01-15');
    });

    it('should use latest endpoint when no date', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await EpicService.getNatural();

      expect(mockGet).toHaveBeenCalledWith('/api/natural');
    });
  });

  describe('getEnhanced()', () => {
    it('should transform enhanced images with correct URL', async () => {
      mockGet.mockResolvedValue({ data: [SAMPLE_IMAGE] });

      const result = await EpicService.getEnhanced();

      expect(result.imageType).toBe('enhanced');
      expect(result.images[0].imageUrl).toContain('/archive/enhanced/');
    });

    it('should use date endpoint when date provided', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await EpicService.getEnhanced('2025-02-20');

      expect(mockGet).toHaveBeenCalledWith('/api/enhanced/date/2025-02-20');
    });

    it('should use latest endpoint when no date', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await EpicService.getEnhanced();

      expect(mockGet).toHaveBeenCalledWith('/api/enhanced');
    });
  });

  describe('getAvailableDates()', () => {
    it('should return array of date strings', async () => {
      mockGet.mockResolvedValue({
        data: [{ date: '2025-01-01' }, { date: '2025-01-02' }],
      });

      const result = await EpicService.getAvailableDates();

      expect(result).toEqual(['2025-01-01', '2025-01-02']);
      expect(mockGet).toHaveBeenCalledWith('/api/natural/available');
    });

    it('should use enhanced endpoint when type is enhanced', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await EpicService.getAvailableDates('enhanced');

      expect(mockGet).toHaveBeenCalledWith('/api/enhanced/available');
    });
  });
});
