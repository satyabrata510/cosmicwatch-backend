import type { Request } from 'express';

/** Express request extended with authenticated user payload. */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/** Available user roles in the system. */
export enum UserRole {
  USER = 'USER',
  RESEARCHER = 'RESEARCHER',
  ADMIN = 'ADMIN',
}

export interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
}
