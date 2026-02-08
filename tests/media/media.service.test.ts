//  Media Service — Unit Tests

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/redis.config', () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  }),
  CacheTTL: { MEDIA_SEARCH: 600, MEDIA_ASSET: 3600 },
  CachePrefix: { MEDIA_SEARCH: 'media:search', MEDIA_ASSET: 'media:asset' },
}));

vi.mock('axios', () => {
  const mockGet = vi.fn();
  return {
    default: { create: () => ({ get: mockGet }) },
    __mockGet: mockGet,
  };
});

import { MediaService } from '../../src/modules/media/media.service';

let mockGet: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  const axios = await import('axios');
  mockGet = (axios as any).__mockGet;
  vi.clearAllMocks();
});

describe('MediaService', () => {
  describe('search()', () => {
    it('should transform search results', async () => {
      mockGet.mockResolvedValue({
        data: {
          collection: {
            items: [
              {
                href: 'https://images-api.nasa.gov/collection/12345',
                data: [
                  {
                    nasa_id: '12345',
                    title: 'Mars Rover',
                    description: 'A photo from Mars',
                    media_type: 'image',
                    date_created: '2023-01-01',
                    center: 'JPL',
                    keywords: ['Mars', 'Rover'],
                    photographer: 'NASA/JPL',
                  },
                ],
                links: [{ href: 'https://thumb.nasa.gov/12345.jpg', rel: 'preview' }],
              },
            ],
            metadata: { total_hits: 100 },
            links: [{ rel: 'next', prompt: 'Next', href: 'https://next' }],
          },
        },
      });

      const result = await MediaService.search({ query: 'mars' });

      expect(result.totalHits).toBe(100);
      expect(result.query).toBe('mars');
      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(1);

      const item = result.items[0];
      expect(item.nasaId).toBe('12345');
      expect(item.title).toBe('Mars Rover');
      expect(item.thumbnailUrl).toBe('https://thumb.nasa.gov/12345.jpg');
      expect(item.photographer).toBe('NASA/JPL');
      expect(item.keywords).toEqual(['Mars', 'Rover']);
    });

    it('should handle items without links or optional fields', async () => {
      mockGet.mockResolvedValue({
        data: {
          collection: {
            items: [
              {
                href: 'https://example.com',
                data: [
                  {
                    nasa_id: '999',
                    title: 'Unknown',
                    media_type: 'video',
                    date_created: '2020-01-01',
                    center: 'HQ',
                    description_508: 'Alt description',
                    secondary_creator: 'Secondary',
                    location: 'Houston, TX',
                  },
                ],
              },
            ],
            metadata: { total_hits: 1 },
          },
        },
      });

      const result = await MediaService.search({ query: 'test' });

      const item = result.items[0];
      expect(item.description).toBe('Alt description');
      expect(item.thumbnailUrl).toBeNull();
      expect(item.photographer).toBe('Secondary');
      expect(item.location).toBe('Houston, TX');
      expect(result.hasMore).toBe(false);
    });

    it('should handle items with no description at all', async () => {
      mockGet.mockResolvedValue({
        data: {
          collection: {
            items: [
              {
                href: 'https://example.com',
                data: [
                  {
                    nasa_id: '888',
                    title: 'No Desc',
                    media_type: 'audio',
                    date_created: '2019-01-01',
                    center: 'KSC',
                  },
                ],
                links: [{ href: 'https://not-preview.jpg', rel: 'captions' }],
              },
            ],
            metadata: { total_hits: 1 },
          },
        },
      });

      const result = await MediaService.search({ query: 'audio' });

      expect(result.items[0].description).toBeNull();
      expect(result.items[0].thumbnailUrl).toBeNull();
      expect(result.items[0].photographer).toBeNull();
      expect(result.items[0].location).toBeNull();
      expect(result.items[0].keywords).toEqual([]);
    });

    it('should pass all search params', async () => {
      mockGet.mockResolvedValue({
        data: { collection: { items: [], metadata: { total_hits: 0 } } },
      });

      await MediaService.search({
        query: 'apollo',
        mediaType: 'image',
        yearStart: 1969,
        yearEnd: 1972,
        page: 2,
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/search',
        expect.objectContaining({
          params: {
            q: 'apollo',
            page: 2,
            media_type: 'image',
            year_start: 1969,
            year_end: 1972,
          },
        })
      );
    });

    it('should handle empty items array', async () => {
      mockGet.mockResolvedValue({
        data: { collection: { items: [], metadata: { total_hits: 0 } } },
      });

      const result = await MediaService.search({ query: 'nothing' });
      expect(result.items).toHaveLength(0);
      expect(result.totalHits).toBe(0);
    });
  });

  describe('getAsset()', () => {
    it('should return asset URLs with types', async () => {
      mockGet.mockResolvedValue({
        data: {
          collection: {
            items: [
              { href: 'https://images.nasa.gov/12345/orig.jpg' },
              { href: 'https://images.nasa.gov/12345/thumb.png' },
              { href: 'https://images.nasa.gov/12345/metadata.json' },
            ],
          },
        },
      });

      const result = await MediaService.getAsset('12345');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        url: 'https://images.nasa.gov/12345/orig.jpg',
        type: 'jpg',
      });
      expect(result[2].type).toBe('json');
    });

    it('should handle empty asset collection', async () => {
      mockGet.mockResolvedValue({
        data: { collection: { items: [] } },
      });

      const result = await MediaService.getAsset('empty');
      expect(result).toHaveLength(0);
    });

    it('should handle null items array', async () => {
      mockGet.mockResolvedValue({
        data: { collection: { items: null } },
      });

      const result = await MediaService.getAsset('null-items');
      expect(result).toHaveLength(0);
    });

    it('should handle URL without extension', async () => {
      mockGet.mockResolvedValue({
        data: {
          collection: {
            items: [{ href: 'https://example.com/file' }],
          },
        },
      });

      const result = await MediaService.getAsset('no-ext');
      // split('.').pop() on 'https://example.com/file' returns 'com/file'
      expect(result[0].type).toBe('com/file');
    });

    it('should handle empty href with unknown type fallback', async () => {
      mockGet.mockResolvedValue({
        data: {
          collection: {
            items: [{ href: '' }],
          },
        },
      });

      const result = await MediaService.getAsset('empty-href');
      expect(result[0].type).toBe('unknown');
    });
  });
});
