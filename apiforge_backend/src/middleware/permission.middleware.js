import { hasMinimumRole } from '../constants/workspaceRoles.js';
import { AppError } from '../utils/appError.js';

/**
 * Higher-order middleware factory that enforces a minimum workspace role
 * @param {string} requiredRole - Minimum role required (e.g. OWNER, ADMIN, MEMBER, VIEWER)
 * @returns {import('express').RequestHandler}
 */
export function requireWorkspaceRole(requiredRole) {
  return (req, res, next) => {
    if (!req.workspaceMember || !req.workspaceMember.role) {
      return next(new AppError('Workspace membership verification required', 403));
    }

    const userRole = req.workspaceMember.role;
    if (!hasMinimumRole(userRole, requiredRole)) {
      return next(
        new AppError(
          `Insufficient permissions: Action requires ${requiredRole} role or higher, but you have ${userRole}`,
          403
        )
      );
    }

    next();
  };
}

export default {
  requireWorkspaceRole,
};

