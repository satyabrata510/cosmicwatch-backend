//  Error Middleware — Unit Tests

import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { AppError, BadRequestError, NotFoundError } from '../../src/utils/errors';

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
  };
  return res;
}

describe('Error Middleware', () => {
  const req = {} as any;
  const next = vi.fn();

  it('should handle AppError subclass (BadRequestError)', () => {
    const res = createMockRes();
    const err = new BadRequestError('Invalid input');

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Invalid input' });
  });

  it('should handle AppError subclass (NotFoundError)', () => {
    const res = createMockRes();
    const err = new NotFoundError('User not found');

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'User not found' });
  });

  it('should handle AppError with custom status code', () => {
    const res = createMockRes();
    const err = new AppError('Teapot error', 418);

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(418);
    expect(res.body.message).toBe('Teapot error');
  });

  it('should handle PrismaClientKnownRequestError', () => {
    const res = createMockRes();
    const err = new Error('Unique constraint violation');
    err.name = 'PrismaClientKnownRequestError';

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Database operation failed' });
  });

  it('should handle ZodError', () => {
    const res = createMockRes();
    const err = new Error('Validation issues');
    err.name = 'ZodError';

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Validation failed' });
  });

  it('should handle unknown errors with 500', () => {
    const res = createMockRes();
    const err = new Error('Something unexpected');

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, message: 'Internal server error' });
  });

  it('should not leak error details for unknown errors', () => {
    const res = createMockRes();
    const err = new Error('Secret database password exposed');

    errorHandler(err, req, res, next);

    expect(res.body.message).toBe('Internal server error');
    expect(res.body.error).toBeUndefined();
    expect(res.body.stack).toBeUndefined();
  });
});
