//  Auth API — Integration Tests
//  POST /register, POST /login, POST /refresh, GET /profile

import { describe, expect, it } from 'vitest';
import {
  API,
  createTestUser,
  generateAccessToken,
  generateExpiredToken,
  registerAndLogin,
  request,
} from '../helpers';

describe('Auth API', () => {
  // POST /auth/register ──────────────────────────────────
  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request.post(`${API}/auth/register`).send({
        name: 'John Doe',
        email: 'john@cosmic.dev',
        password: 'SecurePass1',
        role: 'USER',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toMatchObject({
        name: 'John Doe',
        email: 'john@cosmic.dev',
        role: 'USER',
      });
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // Password should never be returned
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should register a RESEARCHER role', async () => {
      const res = await request.post(`${API}/auth/register`).send({
        name: 'Dr. Smith',
        email: 'smith@cosmic.dev',
        password: 'Research1Pass',
        role: 'RESEARCHER',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('RESEARCHER');
    });

    it('should default role to USER if not provided', async () => {
      const res = await request.post(`${API}/auth/register`).send({
        name: 'Default User',
        email: 'default@cosmic.dev',
        password: 'Password1',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('USER');
    });

    it('should reject duplicate email', async () => {
      await createTestUser({ email: 'dup@cosmic.dev' });

      const res = await request.post(`${API}/auth/register`).send({
        name: 'Another User',
        email: 'dup@cosmic.dev',
        password: 'SecurePass1',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const res = await request.post(`${API}/auth/register`).send({
        name: 'Bad Pass',
        email: 'badpass@cosmic.dev',
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject password without uppercase', async () => {
      const res = await request.post(`${API}/auth/register`).send({
        name: 'No Upper',
        email: 'noupper@cosmic.dev',
        password: 'nouppercase1',
      });

      expect(res.status).toBe(400);
    });

    it('should reject password without number', async () => {
      const res = await request.post(`${API}/auth/register`).send({
        name: 'No Num',
        email: 'nonum@cosmic.dev',
        password: 'NoNumberHere',
      });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request.post(`${API}/auth/register`).send({
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'SecurePass1',
      });

      expect(res.status).toBe(400);
    });

    it('should reject missing name', async () => {
      const res = await request.post(`${API}/auth/register`).send({
        email: 'noname@cosmic.dev',
        password: 'SecurePass1',
      });

      expect(res.status).toBe(400);
    });

    it('should reject name shorter than 2 chars', async () => {
      const res = await request.post(`${API}/auth/register`).send({
        name: 'A',
        email: 'short@cosmic.dev',
        password: 'SecurePass1',
      });

      expect(res.status).toBe(400);
    });
  });

  // POST /auth/login ─────────────────────────────────────
  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const { user, plainPassword } = await createTestUser({
        email: 'login@cosmic.dev',
      });

      const res = await request.post(`${API}/auth/login`).send({
        email: 'login@cosmic.dev',
        password: plainPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('login@cosmic.dev');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      await createTestUser({ email: 'wrongpw@cosmic.dev' });

      const res = await request.post(`${API}/auth/login`).send({
        email: 'wrongpw@cosmic.dev',
        password: 'WrongPassword1',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const res = await request.post(`${API}/auth/login`).send({
        email: 'nobody@cosmic.dev',
        password: 'Password1',
      });

      expect(res.status).toBe(401);
    });

    it('should reject missing password', async () => {
      const res = await request.post(`${API}/auth/login`).send({
        email: 'missing@cosmic.dev',
      });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const res = await request.post(`${API}/auth/login`).send({
        email: 'bad-format',
        password: 'Password1',
      });

      expect(res.status).toBe(400);
    });
  });

  // GET /auth/profile ────────────────────────────────────
  describe('GET /auth/profile', () => {
    it('should return the authenticated user profile', async () => {
      const { user, token } = await registerAndLogin({
        name: 'Profile User',
        email: 'profile@cosmic.dev',
      });

      const res = await request.get(`${API}/auth/profile`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user.id);
      expect(res.body.data.name).toBe('Profile User');
      expect(res.body.data.email).toBe('profile@cosmic.dev');
      expect(res.body.data._count).toBeDefined();
      // Password should never be in the response
      expect(res.body.data.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const res = await request.get(`${API}/auth/profile`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      const { user } = await createTestUser({ email: 'expired@cosmic.dev' });
      const expiredToken = generateExpiredToken(user);

      // Wait a moment for token to actually expire
      await new Promise((r) => setTimeout(r, 1100));

      const res = await request
        .get(`${API}/auth/profile`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject malformed token', async () => {
      const res = await request
        .get(`${API}/auth/profile`)
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });

    it('should reject missing Bearer prefix', async () => {
      const { token } = await registerAndLogin();

      const res = await request.get(`${API}/auth/profile`).set('Authorization', token);

      expect(res.status).toBe(401);
    });

    it('should return 404 when user no longer exists', async () => {
      // Create a valid token for a non-existent user ID
      const fakeToken = generateAccessToken({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'deleted@cosmic.dev',
        role: 'USER',
      });

      const res = await request
        .get(`${API}/auth/profile`)
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // POST /auth/refresh ───────────────────────────────────
  describe('POST /auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const { refreshToken } = await registerAndLogin({
        email: 'refresh@cosmic.dev',
      });

      const res = await request.post(`${API}/auth/refresh`).send({
        refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // New tokens should be different
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request.post(`${API}/auth/refresh`).send({
        refreshToken: 'invalid.token.value',
      });

      expect(res.status).toBe(401);
    });

    it('should reject missing refresh token', async () => {
      const res = await request.post(`${API}/auth/refresh`).send({});

      expect(res.status).toBe(401);
    });
  });
});
