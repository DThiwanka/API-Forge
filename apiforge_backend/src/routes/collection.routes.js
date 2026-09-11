import { Router } from 'express';
import collectionController from '../controllers/collection.controller.js';
import folderRoutes from './folder.routes.js';
import requestRoutes from './request.routes.js';
import { requireCollection } from '../middleware/collection.middleware.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import {
  validateCreateCollection,
  validateUpdateCollection,
} from '../validators/collection.validator.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

// Router with mergeParams so :workspaceId is accessible from parent router
const router = Router({ mergeParams: true });

// Nested folder routes under /:collectionId/folders
router.use('/:collectionId/folders', folderRoutes);

// Nested request routes under /:collectionId/requests
router.use('/:collectionId/requests', requestRoutes);

router.post(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateCreateCollection,
  collectionController.create
);

router.get(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  collectionController.list
);

router.get(
  '/:collectionId',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  requireCollection,
  collectionController.getById
);

router.patch(
  '/:collectionId',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  requireCollection,
  validateUpdateCollection,
  collectionController.update
);

router.delete(
  '/:collectionId',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  requireCollection,
  collectionController.deleteCollection
);

export default router;

