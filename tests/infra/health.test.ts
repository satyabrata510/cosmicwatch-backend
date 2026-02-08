//  Health, Root & Error Handling — Integration Tests

import { describe, expect, it } from 'vitest';
import { API, request } from '../helpers';

//  Root Endpoint
describe('Root Endpoint', () => {
  it('GET / should return API info', async () => {
    const res = await request.get('/');

    expect(res.status).toBe(200);
    expect(res.body.name).toBeDefined();
    expect(res.body.version).toBeDefined();
    expect(res.body.description).toBeDefined();
    expect(res.body.documentation).toBeDefined();
  });
});

//  Health Check
describe('Health Check', () => {
  it('GET /api/v1/health should return health status', async () => {
    const res = await request.get(`${API}/health`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime).toBeTypeOf('number');
  });
});

//  404 — Route Not Found
describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request.get(`${API}/does-not-exist`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found');
  });

  it('should return 404 for non-api paths', async () => {
    const res = await request.get('/random-page');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

//  Error Handler — Malformed Requests
describe('Error Handler', () => {
  it('should handle malformed JSON body', async () => {
    const res = await request
      .post(`${API}/auth/register`)
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThanOrEqual(500);
  });
});
