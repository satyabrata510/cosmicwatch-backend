import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { ApiResponse, PaginationMeta } from '../modules/neo/neo.types';

/** Standardised JSON response helpers for all API endpoints. */
export const ApiResponseHelper = {
  /** Send a success response with optional pagination metadata. */
  success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = StatusCodes.OK,
    meta?: PaginationMeta
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      ...(meta && { meta }),
    };
    return res.status(statusCode).json(response);
  },

  /** Send a 201 Created response. */
  created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    return ApiResponseHelper.success(res, data, message, StatusCodes.CREATED);
  },

  /** Send an error response with optional detail string. */
  error(
    res: Response,
    message: string,
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    error?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      ...(error && { error }),
    };
    return res.status(statusCode).json(response);
  },

  /** Send a 204 No Content response. */
  noContent(res: Response): Response {
    return res.status(StatusCodes.NO_CONTENT).send();
  },
};
