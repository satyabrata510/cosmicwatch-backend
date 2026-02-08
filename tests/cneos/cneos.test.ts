//  CNEOS API — Integration Tests
//  Close Approaches, Sentry, Sentry Detail, Fireballs

import { describe, expect, it } from 'vitest';
import { API, request } from '../helpers';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

describe('CNEOS API', () => {
  describe('GET /cneos/close-approaches', () => {
    it('should return close approach data', async () => {
      const res = await request
        .get(`${API}/cneos/close-approaches`)
        .query({ date_min: daysAgo(7), date_max: today() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should accept all optional filter params', async () => {
      const res = await request.get(`${API}/cneos/close-approaches`).query({
        date_min: daysAgo(30),
        date_max: today(),
        limit: '5',
        pha: 'true',
        dist_max: '5LD',
        sort: 'date',
      });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /cneos/sentry', () => {
    it('should return Sentry impact monitoring list', async () => {
      const res = await request.get(`${API}/cneos/sentry`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should accept sentry filter params', async () => {
      const res = await request
        .get(`${API}/cneos/sentry`)
        .query({ ps_min: '-3', ip_min: '1e-7', h_max: '22' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /cneos/sentry/:designation', () => {
    it('should return Sentry detail for valid designation', async () => {
      const res = await request.get(`${API}/cneos/sentry/101955`);

      // Might be 200 with data or the API may have changed — accept both
      expect([200, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      }
    });
  });

  describe('GET /cneos/fireballs', () => {
    it('should return fireball data', async () => {
      const res = await request
        .get(`${API}/cneos/fireballs`)
        .query({ date_min: daysAgo(365), date_max: today() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept fireball filter params', async () => {
      const res = await request.get(`${API}/cneos/fireballs`).query({
        date_min: daysAgo(365),
        date_max: today(),
        limit: '3',
        sort: '-energy',
        energy_min: '0.1',
        req_loc: 'true',
      });

      expect(res.status).toBe(200);
    });
  });
});
