import { permissionService } from '../services/collaboration/permission.service.js';
import { AppError } from '../utils/appError.js';

export function requireRole(requiredRole) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'VIEWER';
    if (!permissionService.canPerform(userRole, requiredRole)) {
      return next(new AppError('Forbidden: Insufficient permissions', 403));
    }
    next();
  };
}

export default requireRole;
