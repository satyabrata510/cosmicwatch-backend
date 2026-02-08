//  EPIC API — Integration Tests
//  Natural, Enhanced, Dates

import { describe, expect, it } from 'vitest';
import { API, request } from '../helpers';

describe('EPIC API', () => {
  describe('GET /epic/natural', () => {
    it('should return EPIC natural-color images', async () => {
      const res = await request.get(`${API}/epic/natural`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /epic/enhanced', () => {
    it('should return EPIC enhanced images', async () => {
      const res = await request.get(`${API}/epic/enhanced`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /epic/dates', () => {
    it('should return available dates for natural images', async () => {
      const res = await request.get(`${API}/epic/dates`).query({ type: 'natural' });

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('natural');
      expect(res.body.data.dates).toBeDefined();
    });

    it('should default to natural type', async () => {
      const res = await request.get(`${API}/epic/dates`);

      expect(res.body.data.type).toBe('natural');
    });

    it('should return enhanced dates when type=enhanced', async () => {
      const res = await request.get(`${API}/epic/dates`).query({ type: 'enhanced' });

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('enhanced');
    });
  });
});
