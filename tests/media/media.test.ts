//  NASA Media API — Integration Tests
//  Search, Asset

import { describe, expect, it } from 'vitest';
import { API, request } from '../helpers';

describe('NASA Media API', () => {
  describe('GET /media/search', () => {
    it('should search NASA media library', async () => {
      const res = await request.get(`${API}/media/search`).query({ q: 'asteroid' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should require query parameter', async () => {
      const res = await request.get(`${API}/media/search`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should support media_type filter', async () => {
      const res = await request
        .get(`${API}/media/search`)
        .query({ q: 'mars', media_type: 'image' });

      expect(res.status).toBe(200);
    });

    it('should support year and page filters', async () => {
      const res = await request
        .get(`${API}/media/search`)
        .query({ q: 'apollo', year_start: '1969', year_end: '1972', page: '1' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /media/asset/:nasaId', () => {
    it('should retrieve asset details for a NASA ID', async () => {
      const res = await request.get(`${API}/media/asset/PIA12235`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.nasaId).toBe('PIA12235');
      expect(res.body.data.assets).toBeDefined();
    });
  });
});
