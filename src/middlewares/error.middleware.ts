import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/** Global Express error handler — normalises all errors into a JSON envelope. */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  /** Log error with full stack trace (stays in server logs only). */
  logger.error(
    { err, ...(err instanceof AppError && { statusCode: err.statusCode }) },
    err.message
  );

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Database operation failed',
    });
    return;
  }

  if (err.name === 'ZodError') {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
    });
    return;
  }

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Internal server error',
  });
};
