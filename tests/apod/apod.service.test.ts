//  APOD Service — Unit Tests

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/redis.config', () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  }),
  CacheTTL: { APOD_TODAY: 21600, APOD_RANGE: 86400 },
  CachePrefix: { APOD: 'apod' },
}));

vi.mock('axios', () => {
  const mockGet = vi.fn();
  return {
    default: { create: () => ({ get: mockGet }) },
    __mockGet: mockGet,
  };
});

import { ApodService } from '../../src/modules/apod/apod.service';

let mockGet: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  const axios = await import('axios');
  mockGet = (axios as any).__mockGet;
  vi.clearAllMocks();
});

const SAMPLE_APOD: any = {
  title: 'Orion Nebula',
  date: '2025-01-01',
  explanation: 'A beautiful nebula.',
  media_type: 'image',
  url: 'https://apod.nasa.gov/image.jpg',
  hdurl: 'https://apod.nasa.gov/image_hd.jpg',
  thumbnail_url: 'https://apod.nasa.gov/thumb.jpg',
  copyright: 'NASA',
  service_version: 'v1',
};

describe('ApodService', () => {
  describe('getToday()', () => {
    it('should transform APOD data', async () => {
      mockGet.mockResolvedValue({ data: SAMPLE_APOD });

      const result = await ApodService.getToday('2025-01-01');

      expect(result.title).toBe('Orion Nebula');
      expect(result.mediaType).toBe('image');
      expect(result.hdUrl).toBe('https://apod.nasa.gov/image_hd.jpg');
      expect(result.thumbnailUrl).toBe('https://apod.nasa.gov/thumb.jpg');
      expect(result.copyright).toBe('NASA');
    });

    it('should handle missing optional fields', async () => {
      mockGet.mockResolvedValue({
        data: { ...SAMPLE_APOD, hdurl: undefined, thumbnail_url: undefined, copyright: undefined },
      });

      const result = await ApodService.getToday();

      expect(result.hdUrl).toBeNull();
      expect(result.thumbnailUrl).toBeNull();
      expect(result.copyright).toBeNull();
    });

    it('should pass date param when provided', async () => {
      mockGet.mockResolvedValue({ data: SAMPLE_APOD });

      await ApodService.getToday('2025-06-15');

      expect(mockGet).toHaveBeenCalledWith(
        '/apod',
        expect.objectContaining({
          params: expect.objectContaining({ date: '2025-06-15', thumbs: true }),
        })
      );
    });
  });

  describe('getRandom()', () => {
    it('should return array of transformed APODs', async () => {
      mockGet.mockResolvedValue({ data: [SAMPLE_APOD, SAMPLE_APOD] });

      const result = await ApodService.getRandom(2);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Orion Nebula');
    });

    it('should clamp count between 1 and 10', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await ApodService.getRandom(50);

      expect(mockGet).toHaveBeenCalledWith(
        '/apod',
        expect.objectContaining({
          params: expect.objectContaining({ count: 10 }),
        })
      );
    });

    it('should clamp count minimum to 1', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await ApodService.getRandom(0);

      expect(mockGet).toHaveBeenCalledWith(
        '/apod',
        expect.objectContaining({
          params: expect.objectContaining({ count: 1 }),
        })
      );
    });

    it('should default count to 5', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await ApodService.getRandom();

      expect(mockGet).toHaveBeenCalledWith(
        '/apod',
        expect.objectContaining({
          params: expect.objectContaining({ count: 5 }),
        })
      );
    });
  });

  describe('getRange()', () => {
    it('should return array of APODs for date range', async () => {
      mockGet.mockResolvedValue({ data: [SAMPLE_APOD] });

      const result = await ApodService.getRange('2025-01-01', '2025-01-07');

      expect(result).toHaveLength(1);
      expect(mockGet).toHaveBeenCalledWith(
        '/apod',
        expect.objectContaining({
          params: expect.objectContaining({
            start_date: '2025-01-01',
            end_date: '2025-01-07',
          }),
        })
      );
    });
  });
});
