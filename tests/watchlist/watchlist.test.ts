//  Watchlist API — Integration Tests
//  POST /, GET /, PATCH /:id, DELETE /:id (all authenticated)

import { describe, expect, it } from 'vitest';
import { API, createTestWatchlistItem, registerAndLogin, request } from '../helpers';

describe('Watchlist API', () => {
  // POST /watchlist ──────────────────────────────────────
  describe('POST /watchlist', () => {
    it('should add asteroid to watchlist', async () => {
      const { token } = await registerAndLogin({ email: 'wl-add@cosmic.dev' });

      const res = await request
        .post(`${API}/watchlist`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          asteroidId: '3542519',
          asteroidName: '(2010 PK9)',
          alertOnApproach: true,
          alertDistanceKm: 5_000_000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.asteroidId).toBe('3542519');
      expect(res.body.data.asteroidName).toBe('(2010 PK9)');
      expect(res.body.data.alertOnApproach).toBe(true);
      expect(res.body.data.alertDistanceKm).toBe(5_000_000);
    });

    it('should use default alertDistanceKm when not provided', async () => {
      const { token } = await registerAndLogin({ email: 'wl-default@cosmic.dev' });

      const res = await request
        .post(`${API}/watchlist`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          asteroidId: '99942',
          asteroidName: 'Apophis',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.alertDistanceKm).toBe(7_500_000);
      expect(res.body.data.alertOnApproach).toBe(true);
    });

    it('should reject duplicate asteroid in watchlist', async () => {
      const { user, token } = await registerAndLogin({ email: 'wl-dup@cosmic.dev' });
      await createTestWatchlistItem(user.id, { asteroidId: 'DUP-001' });

      const res = await request
        .post(`${API}/watchlist`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          asteroidId: 'DUP-001',
          asteroidName: 'Duplicate Asteroid',
        });

      expect(res.status).toBe(409);
    });

    it('should reject missing asteroidId', async () => {
      const { token } = await registerAndLogin({ email: 'wl-noid@cosmic.dev' });

      const res = await request
        .post(`${API}/watchlist`)
        .set('Authorization', `Bearer ${token}`)
        .send({ asteroidName: 'No ID' });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request.post(`${API}/watchlist`).send({
        asteroidId: '123',
        asteroidName: 'Unauth',
      });

      expect(res.status).toBe(401);
    });
  });

  // GET /watchlist ───────────────────────────────────────
  describe('GET /watchlist', () => {
    it('should return paginated watchlist', async () => {
      const { user, token } = await registerAndLogin({ email: 'wl-list@cosmic.dev' });
      await createTestWatchlistItem(user.id, { asteroidId: 'LIST-1', asteroidName: 'Alpha' });
      await createTestWatchlistItem(user.id, { asteroidId: 'LIST-2', asteroidName: 'Beta' });
      await createTestWatchlistItem(user.id, { asteroidId: 'LIST-3', asteroidName: 'Gamma' });

      const res = await request.get(`${API}/watchlist`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.page).toBe(1);
    });

    it('should respect pagination params', async () => {
      const { user, token } = await registerAndLogin({ email: 'wl-page@cosmic.dev' });
      for (let i = 0; i < 5; i++) {
        await createTestWatchlistItem(user.id, { asteroidId: `PAGE-${i}` });
      }

      const res = await request
        .get(`${API}/watchlist?page=2&limit=2`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.total).toBe(5);
      expect(res.body.meta.totalPages).toBe(3);
    });

    it('should return empty watchlist for new user', async () => {
      const { token } = await registerAndLogin({ email: 'wl-empty@cosmic.dev' });

      const res = await request.get(`${API}/watchlist`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });

    it('should not return other users watchlist items', async () => {
      const { user: user1 } = await registerAndLogin({ email: 'wl-iso1@cosmic.dev' });
      const { token: token2 } = await registerAndLogin({ email: 'wl-iso2@cosmic.dev' });
      await createTestWatchlistItem(user1.id, { asteroidId: 'ISOLATED-1' });

      const res = await request.get(`${API}/watchlist`).set('Authorization', `Bearer ${token2}`);

      expect(res.body.data).toHaveLength(0);
    });
  });

  // PATCH /watchlist/:asteroidId ─────────────────────────
  describe('PATCH /watchlist/:asteroidId', () => {
    it('should update alert settings', async () => {
      const { user, token } = await registerAndLogin({ email: 'wl-upd@cosmic.dev' });
      await createTestWatchlistItem(user.id, { asteroidId: 'UPD-1' });

      const res = await request
        .patch(`${API}/watchlist/UPD-1`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          alertOnApproach: false,
          alertDistanceKm: 3_000_000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.alertOnApproach).toBe(false);
      expect(res.body.data.alertDistanceKm).toBe(3_000_000);
    });

    it('should partially update (only alertOnApproach)', async () => {
      const { user, token } = await registerAndLogin({ email: 'wl-partial@cosmic.dev' });
      await createTestWatchlistItem(user.id, {
        asteroidId: 'PARTIAL-1',
        alertDistanceKm: 7_500_000,
      });

      const res = await request
        .patch(`${API}/watchlist/PARTIAL-1`)
        .set('Authorization', `Bearer ${token}`)
        .send({ alertOnApproach: false });

      expect(res.status).toBe(200);
      expect(res.body.data.alertOnApproach).toBe(false);
      expect(res.body.data.alertDistanceKm).toBe(7_500_000);
    });

    it('should return 404 for non-existent asteroid', async () => {
      const { token } = await registerAndLogin({ email: 'wl-upd404@cosmic.dev' });

      const res = await request
        .patch(`${API}/watchlist/NON-EXISTENT`)
        .set('Authorization', `Bearer ${token}`)
        .send({ alertOnApproach: false });

      expect(res.status).toBe(404);
    });
  });

  // DELETE /watchlist/:asteroidId ────────────────────────
  describe('DELETE /watchlist/:asteroidId', () => {
    it('should remove asteroid from watchlist', async () => {
      const { user, token } = await registerAndLogin({ email: 'wl-del@cosmic.dev' });
      await createTestWatchlistItem(user.id, { asteroidId: 'DEL-1' });

      const delRes = await request
        .delete(`${API}/watchlist/DEL-1`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);

      // Verify it's gone
      const listRes = await request.get(`${API}/watchlist`).set('Authorization', `Bearer ${token}`);

      expect(listRes.body.data).toHaveLength(0);
    });

    it('should return 404 for non-existent asteroid', async () => {
      const { token } = await registerAndLogin({ email: 'wl-del404@cosmic.dev' });

      const res = await request
        .delete(`${API}/watchlist/NON-EXISTENT`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should not allow deleting another users item', async () => {
      const { user: user1 } = await registerAndLogin({ email: 'wl-own1@cosmic.dev' });
      const { token: token2 } = await registerAndLogin({ email: 'wl-own2@cosmic.dev' });
      await createTestWatchlistItem(user1.id, { asteroidId: 'OWN-1' });

      const res = await request
        .delete(`${API}/watchlist/OWN-1`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(404);
    });
  });
});
