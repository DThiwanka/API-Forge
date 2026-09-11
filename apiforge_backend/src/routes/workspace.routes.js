import { Router } from 'express';
import workspaceController from '../controllers/workspace.controller.js';
import collectionRoutes from './collection.routes.js';
import environmentRoutes from './environment.routes.js';
import historyRoutes from './history.routes.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireWorkspaceMember } from '../middleware/workspace.middleware.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import {
  validateCreateWorkspace,
  validateUpdateWorkspace,
} from '../validators/workspace.validator.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

const router = Router();

// All workspace routes require an authenticated user
router.use(authenticate);

// Nested collection routes under /:workspaceId/collections
router.use('/:workspaceId/collections', requireWorkspaceMember, collectionRoutes);

// Nested environment routes under /:workspaceId/environments
router.use('/:workspaceId/environments', requireWorkspaceMember, environmentRoutes);

// Nested history routes under /:workspaceId/history
router.use('/:workspaceId/history', requireWorkspaceMember, historyRoutes);

// Collection-level routes
router.post('/', validateCreateWorkspace, workspaceController.create);
router.get('/', workspaceController.list);

// Resource-level routes
router.get(
  '/:workspaceId',
  requireWorkspaceMember,
  workspaceController.getById
);

router.patch(
  '/:workspaceId',
  requireWorkspaceMember,
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  validateUpdateWorkspace,
  workspaceController.update
);

router.delete(
  '/:workspaceId',
  requireWorkspaceMember,
  requireWorkspaceRole(WORKSPACE_ROLES.OWNER),
  workspaceController.deleteWorkspace
);

export default router;

