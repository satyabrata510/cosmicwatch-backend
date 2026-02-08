import type { NextFunction, Response } from 'express';
import { type AuthenticatedRequest, UserRole } from '../modules/auth/auth.types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';
type Resource =
  | 'users'
  | 'watchlist'
  | 'alerts'
  | 'neo_data'
  | 'chat'
  | 'admin_panel'
  | 'risk_analysis';

type PermissionMatrix = Record<UserRole, Partial<Record<Resource, Action[]>>>;

const PERMISSIONS: PermissionMatrix = {
  [UserRole.ADMIN]: {
    users: ['create', 'read', 'update', 'delete', 'manage'],
    watchlist: ['create', 'read', 'update', 'delete', 'manage'],
    alerts: ['create', 'read', 'update', 'delete', 'manage'],
    neo_data: ['read', 'manage'],
    chat: ['create', 'read', 'update', 'delete', 'manage'],
    admin_panel: ['read', 'manage'],
    risk_analysis: ['read', 'manage'],
  },
  [UserRole.RESEARCHER]: {
    users: ['read', 'update'],
    watchlist: ['create', 'read', 'update', 'delete'],
    alerts: ['create', 'read', 'update', 'delete'],
    neo_data: ['read'],
    chat: ['create', 'read'],
    risk_analysis: ['read'],
  },
  [UserRole.USER]: {
    users: ['read', 'update'],
    watchlist: ['create', 'read', 'delete'],
    alerts: ['read', 'update'],
    neo_data: ['read'],
    chat: ['create', 'read'],
    risk_analysis: ['read'],
  },
};

/** Check whether a role has the given action on a resource. */
export function hasPermission(role: UserRole, resource: Resource, action: Action): boolean {
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;
  const resourceActions = rolePermissions[resource];
  if (!resourceActions) return false;
  return resourceActions.includes(action) || resourceActions.includes('manage');
}

/** Middleware that checks the authenticated user has a specific permission. */
export const requirePermission = (resource: Resource, action: Action) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!hasPermission(req.user.role, resource, action)) {
      next(
        new ForbiddenError(
          `Insufficient permissions: ${req.user.role} cannot ${action} on ${resource}`
        )
      );
      return;
    }

    next();
  };
};

/** Middleware that restricts access to specific roles. */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError(`Required role: ${roles.join(' or ')}`));
      return;
    }

    next();
  };
};

/** Middleware that ensures the user owns the resource (admins bypass). */
export const requireOwnership = (paramName: string = 'userId') => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    const resourceOwnerId = req.params[paramName];
    if (resourceOwnerId && resourceOwnerId !== req.user.id) {
      next(new ForbiddenError('You can only access your own resources'));
      return;
    }

    next();
  };
};
