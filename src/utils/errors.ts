import { StatusCodes } from 'http-status-codes';

/** Base application error with HTTP status code and operational flag. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 Bad Request — invalid client input. */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

/** 401 Unauthorized — missing or invalid authentication. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

/** 403 Forbidden — authenticated but lacks permission. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, StatusCodes.FORBIDDEN);
  }
}

/** 404 Not Found — requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, StatusCodes.NOT_FOUND);
  }
}

/** 409 Conflict — resource already exists. */
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, StatusCodes.CONFLICT);
  }
}

/** 429 Too Many Requests — rate limit exceeded. */
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, StatusCodes.TOO_MANY_REQUESTS);
  }
}
