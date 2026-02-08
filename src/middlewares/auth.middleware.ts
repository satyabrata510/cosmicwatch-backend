import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import type { AuthenticatedRequest, UserPayload, UserRole } from '../modules/auth/auth.types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/** Extract and verify JWT from the Authorization header, attaching the decoded user to `req.user`. */
export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedError('Access token is required');
    }

    const decoded = jwt.verify(token, env.jwt.secret) as UserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

/** Restrict access to users whose role is in the allowed list. */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
};
