//  Alerts API — Integration Tests
//  GET /, GET /unread-count, PATCH /:id/read, PATCH /read-all

import { describe, expect, it } from 'vitest';
import { API, createTestAlert, registerAndLogin, request } from '../helpers';

describe('Alerts API', () => {
  // GET /alerts ──────────────────────────────────────────
  describe('GET /alerts', () => {
    it('should return paginated alerts', async () => {
      const { user, token } = await registerAndLogin({ email: 'al-list@cosmic.dev' });
      await createTestAlert(user.id, { asteroidId: 'A-1' });
      await createTestAlert(user.id, { asteroidId: 'A-2' });
      await createTestAlert(user.id, { asteroidId: 'A-3' });

      const res = await request.get(`${API}/alerts`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta.total).toBe(3);
    });

    it('should filter unread-only alerts', async () => {
      const { user, token } = await registerAndLogin({ email: 'al-unread@cosmic.dev' });
      await createTestAlert(user.id, { asteroidId: 'U-1', isRead: false });
      await createTestAlert(user.id, { asteroidId: 'U-2', isRead: true });
      await createTestAlert(user.id, { asteroidId: 'U-3', isRead: false });

      const res = await request
        .get(`${API}/alerts?unread=true`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should respect pagination', async () => {
      const { user, token } = await registerAndLogin({ email: 'al-page@cosmic.dev' });
      for (let i = 0; i < 5; i++) {
        await createTestAlert(user.id, { asteroidId: `PG-${i}` });
      }

      const res = await request
        .get(`${API}/alerts?page=1&limit=2`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(5);
      expect(res.body.meta.totalPages).toBe(3);
    });

    it('should return empty for new user', async () => {
      const { token } = await registerAndLogin({ email: 'al-empty@cosmic.dev' });

      const res = await request.get(`${API}/alerts`).set('Authorization', `Bearer ${token}`);

      expect(res.body.data).toHaveLength(0);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request.get(`${API}/alerts`);
      expect(res.status).toBe(401);
    });

    it('should not return other users alerts', async () => {
      const { user: user1 } = await registerAndLogin({ email: 'al-iso1@cosmic.dev' });
      const { token: token2 } = await registerAndLogin({ email: 'al-iso2@cosmic.dev' });
      await createTestAlert(user1.id);

      const res = await request.get(`${API}/alerts`).set('Authorization', `Bearer ${token2}`);

      expect(res.body.data).toHaveLength(0);
    });
  });

  // GET /alerts/unread-count ─────────────────────────────
  describe('GET /alerts/unread-count', () => {
    it('should return correct unread count', async () => {
      const { user, token } = await registerAndLogin({ email: 'al-count@cosmic.dev' });
      await createTestAlert(user.id, { isRead: false });
      await createTestAlert(user.id, { isRead: false });
      await createTestAlert(user.id, { isRead: true });

      const res = await request
        .get(`${API}/alerts/unread-count`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(2);
    });

    it('should return 0 when no unread alerts', async () => {
      const { user, token } = await registerAndLogin({ email: 'al-zero@cosmic.dev' });
      await createTestAlert(user.id, { isRead: true });

      const res = await request
        .get(`${API}/alerts/unread-count`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.data.count).toBe(0);
    });
  });

  // PATCH /alerts/:alertId/read ──────────────────────────
  describe('PATCH /alerts/:alertId/read', () => {
    it('should mark a specific alert as read', async () => {
      const { user, token } = await registerAndLogin({ email: 'al-mark@cosmic.dev' });
      const alert = await createTestAlert(user.id, { isRead: false });

      const res = await request
        .patch(`${API}/alerts/${alert.id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify the unread count decreased
      const countRes = await request
        .get(`${API}/alerts/unread-count`)
        .set('Authorization', `Bearer ${token}`);

      expect(countRes.body.data.count).toBe(0);
    });

    it('should not affect other users alerts', async () => {
      const { user: user1 } = await registerAndLogin({ email: 'al-own1@cosmic.dev' });
      const { user: user2, token: token2 } = await registerAndLogin({
        email: 'al-own2@cosmic.dev',
      });
      const alert1 = await createTestAlert(user1.id, { isRead: false });
      await createTestAlert(user2.id, { isRead: false });

      // User 2 tries to mark user 1's alert as read
      await request
        .patch(`${API}/alerts/${alert1.id}/read`)
        .set('Authorization', `Bearer ${token2}`);

      // User 2's unread count should still be 1
      const countRes = await request
        .get(`${API}/alerts/unread-count`)
        .set('Authorization', `Bearer ${token2}`);

      expect(countRes.body.data.count).toBe(1);
    });
  });

  // PATCH /alerts/read-all ───────────────────────────────
  describe('PATCH /alerts/read-all', () => {
    it('should mark all alerts as read', async () => {
      const { user, token } = await registerAndLogin({ email: 'al-readall@cosmic.dev' });
      await createTestAlert(user.id, { isRead: false, asteroidId: 'RA-1' });
      await createTestAlert(user.id, { isRead: false, asteroidId: 'RA-2' });
      await createTestAlert(user.id, { isRead: false, asteroidId: 'RA-3' });

      const res = await request
        .patch(`${API}/alerts/read-all`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // All should be read now
      const countRes = await request
        .get(`${API}/alerts/unread-count`)
        .set('Authorization', `Bearer ${token}`);

      expect(countRes.body.data.count).toBe(0);
    });

    it('should only affect the requesting users alerts', async () => {
      const { user: user1, token: token1 } = await registerAndLogin({ email: 'al-ra1@cosmic.dev' });
      const { user: user2, token: token2 } = await registerAndLogin({ email: 'al-ra2@cosmic.dev' });
      await createTestAlert(user1.id, { isRead: false });
      await createTestAlert(user2.id, { isRead: false });

      // User 1 marks all as read
      await request.patch(`${API}/alerts/read-all`).set('Authorization', `Bearer ${token1}`);

      // User 2 should still have unread
      const countRes = await request
        .get(`${API}/alerts/unread-count`)
        .set('Authorization', `Bearer ${token2}`);

      expect(countRes.body.data.count).toBe(1);
    });
  });
});
