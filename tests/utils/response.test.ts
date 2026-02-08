//  ApiResponseHelper — Unit Tests

import { StatusCodes } from 'http-status-codes';
import { describe, expect, it, vi } from 'vitest';
import { ApiResponseHelper } from '../../src/utils/response';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
    send() {
      return res;
    },
  };
  return res;
}

describe('ApiResponseHelper', () => {
  describe('success()', () => {
    it('should return 200 with data and message', () => {
      const res = createMockRes();
      ApiResponseHelper.success(res, { foo: 'bar' }, 'OK');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'OK',
        data: { foo: 'bar' },
      });
    });

    it('should include meta when provided', () => {
      const res = createMockRes();
      const meta = { page: 1, limit: 20, total: 100, totalPages: 5 };
      ApiResponseHelper.success(res, [], 'Listed', 200, meta);
      expect(res.body.meta).toEqual(meta);
    });

    it('should use custom status code', () => {
      const res = createMockRes();
      ApiResponseHelper.success(res, null, 'Accepted', 202);
      expect(res.statusCode).toBe(202);
    });
  });

  describe('created()', () => {
    it('should return 201', () => {
      const res = createMockRes();
      ApiResponseHelper.created(res, { id: '1' }, 'Resource created');
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Resource created');
    });

    it('should use default message', () => {
      const res = createMockRes();
      ApiResponseHelper.created(res, {});
      expect(res.body.message).toBe('Created successfully');
    });
  });

  describe('error()', () => {
    it('should return error response with default status', () => {
      const res = createMockRes();
      ApiResponseHelper.error(res, 'Something failed');
      expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(res.body).toEqual({
        success: false,
        message: 'Something failed',
      });
    });

    it('should include error detail when provided', () => {
      const res = createMockRes();
      ApiResponseHelper.error(res, 'Validation failed', 400, 'Field X is required');
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Field X is required');
    });

    it('should use custom status code', () => {
      const res = createMockRes();
      ApiResponseHelper.error(res, 'Not Found', 404);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('noContent()', () => {
    it('should return 204 with no body', () => {
      const res = createMockRes();
      const sendSpy = vi.spyOn(res, 'send');
      ApiResponseHelper.noContent(res);
      expect(res.statusCode).toBe(204);
      expect(sendSpy).toHaveBeenCalled();
    });
  });
});
