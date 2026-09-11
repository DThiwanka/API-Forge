import { Router } from 'express';
import historyController from '../controllers/history.controller.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import {
  validateListHistory,
  validateHistoryIdParam,
  validateClearHistory,
} from '../validators/history.validator.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

// mergeParams: true allows accessing :workspaceId from the parent workspace router
const router = Router({ mergeParams: true });

// ==========================================
// HISTORY ROUTES
// ==========================================

// List execution history records
router.get(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  validateListHistory,
  historyController.list
);

// Clear execution history (workspace-wide or by requestId)
router.delete(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  validateClearHistory,
  historyController.clear
);

// Get single execution history record
router.get(
  '/:historyId',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  validateHistoryIdParam,
  historyController.getById
);

// Delete single execution history record
router.delete(
  '/:historyId',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateHistoryIdParam,
  historyController.deleteItem
);

export default router;

