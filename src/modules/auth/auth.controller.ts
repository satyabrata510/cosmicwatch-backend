import type { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../utils';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

/** Handles HTTP requests for authentication and user management. */
export const AuthController = {
  /** POST /api/v1/auth/register — create a new user account. */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      ApiResponseHelper.created(res, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/v1/auth/login — authenticate and return JWT tokens. */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      ApiResponseHelper.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/v1/auth/profile — retrieve the authenticated user's profile. */
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getProfile(req.user!.id);
      ApiResponseHelper.success(res, user);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/v1/auth/refresh — issue new access/refresh token pair. */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshToken(refreshToken);
      ApiResponseHelper.success(res, tokens, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  },
};
