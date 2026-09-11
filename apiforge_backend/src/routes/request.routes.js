import { Router } from 'express';
import requestController from '../controllers/request.controller.js';
import { requireCollection } from '../middleware/collection.middleware.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import {
  validateCreateRequest,
  validateUpdateRequest,
} from '../validators/request.validator.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

// Router with mergeParams so :workspaceId and :collectionId are accessible
const router = Router({ mergeParams: true });

// All request routes require valid collection in workspace context
router.use(requireCollection);

router.post(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateCreateRequest,
  requestController.create
);

router.get(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  requestController.list
);

router.get(
  '/:requestId',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  requestController.getById
);

router.patch(
  '/:requestId',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateUpdateRequest,
  requestController.update
);

router.delete(
  '/:requestId',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  requestController.deleteRequest
);

router.post(
  '/:requestId/duplicate',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  requestController.duplicate
);

export default router;

