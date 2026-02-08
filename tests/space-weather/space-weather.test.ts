//  Space Weather API — Integration Tests
//  CME, Flares, Storms, Notifications (DONKI)

import { describe, expect, it } from 'vitest';
import { API, request } from '../helpers';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

describe('Space Weather API', () => {
  const dateParams = { start_date: daysAgo(30), end_date: today() };

  describe('GET /space-weather/cme', () => {
    it('should return CME data', async () => {
      const res = await request.get(`${API}/space-weather/cme`).query(dateParams);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /space-weather/flares', () => {
    it('should return solar flare data', async () => {
      const res = await request.get(`${API}/space-weather/flares`).query(dateParams);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /space-weather/storms', () => {
    it('should return geomagnetic storm data', async () => {
      const res = await request.get(`${API}/space-weather/storms`).query(dateParams);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /space-weather/notifications', () => {
    it('should return space weather notifications', async () => {
      const res = await request.get(`${API}/space-weather/notifications`).query(dateParams);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
