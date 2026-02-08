//  Error Classes — Unit Tests

import { StatusCodes } from 'http-status-codes';
import { describe, expect, it } from 'vitest';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../src/utils/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create with default values', () => {
      const err = new AppError('Something went wrong');
      expect(err.message).toBe('Something went wrong');
      expect(err.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(err.isOperational).toBe(true);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err.stack).toBeDefined();
    });

    it('should create with custom status code', () => {
      const err = new AppError('Custom', 418);
      expect(err.statusCode).toBe(418);
    });

    it('should create with isOperational = false', () => {
      const err = new AppError('Fatal', 500, false);
      expect(err.isOperational).toBe(false);
    });
  });

  describe('BadRequestError', () => {
    it('should use default message', () => {
      const err = new BadRequestError();
      expect(err.message).toBe('Bad Request');
      expect(err.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(err).toBeInstanceOf(AppError);
    });

    it('should accept custom message', () => {
      const err = new BadRequestError('Invalid input');
      expect(err.message).toBe('Invalid input');
      expect(err.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe('UnauthorizedError', () => {
    it('should use default message', () => {
      const err = new UnauthorizedError();
      expect(err.message).toBe('Unauthorized');
      expect(err.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('should accept custom message', () => {
      const err = new UnauthorizedError('Token expired');
      expect(err.message).toBe('Token expired');
    });
  });

  describe('ForbiddenError', () => {
    it('should use default message', () => {
      const err = new ForbiddenError();
      expect(err.message).toBe('Forbidden');
      expect(err.statusCode).toBe(StatusCodes.FORBIDDEN);
      expect(err).toBeInstanceOf(AppError);
    });

    it('should accept custom message', () => {
      const err = new ForbiddenError('Insufficient permissions');
      expect(err.message).toBe('Insufficient permissions');
    });
  });

  describe('NotFoundError', () => {
    it('should use default message', () => {
      const err = new NotFoundError();
      expect(err.message).toBe('Resource not found');
      expect(err.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('should accept custom message', () => {
      const err = new NotFoundError('User not found');
      expect(err.message).toBe('User not found');
    });
  });

  describe('ConflictError', () => {
    it('should use default message', () => {
      const err = new ConflictError();
      expect(err.message).toBe('Conflict');
      expect(err.statusCode).toBe(StatusCodes.CONFLICT);
    });

    it('should accept custom message', () => {
      const err = new ConflictError('Email taken');
      expect(err.message).toBe('Email taken');
    });
  });

  describe('TooManyRequestsError', () => {
    it('should use default message', () => {
      const err = new TooManyRequestsError();
      expect(err.message).toBe('Too many requests');
      expect(err.statusCode).toBe(StatusCodes.TOO_MANY_REQUESTS);
      expect(err).toBeInstanceOf(AppError);
    });

    it('should accept custom message', () => {
      const err = new TooManyRequestsError('Rate limit exceeded');
      expect(err.message).toBe('Rate limit exceeded');
    });
  });
});
