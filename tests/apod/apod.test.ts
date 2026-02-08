//  APOD API — Integration Tests
//  Today, Random, Range

import { describe, expect, it } from 'vitest';
import { API, request } from '../helpers';

describe('APOD API', () => {
  describe('GET /apod/today', () => {
    it('should return todays APOD', async () => {
      const res = await request.get(`${API}/apod/today`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toBeDefined();
      expect(res.body.data.url).toBeDefined();
    });

    it('should accept optional date parameter', async () => {
      const res = await request.get(`${API}/apod/today`).query({ date: '2024-01-15' });

      expect(res.status).toBe(200);
      expect(res.body.data.date).toBe('2024-01-15');
    });
  });

  describe('GET /apod/random', () => {
    it('should return random APODs', async () => {
      const res = await request.get(`${API}/apod/random`).query({ count: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /apod/range', () => {
    it('should return APODs for a date range', async () => {
      const res = await request
        .get(`${API}/apod/range`)
        .query({ start_date: '2024-01-01', end_date: '2024-01-03' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should require start_date and end_date', async () => {
      const res = await request.get(`${API}/apod/range`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
