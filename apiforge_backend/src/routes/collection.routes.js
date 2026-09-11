import { Router } from 'express';
import collectionController from '../controllers/collection.controller.js';
import exportController from '../controllers/export.controller.js';
import runnerController from '../controllers/runner.controller.js';
import folderRoutes from './folder.routes.js';
import requestRoutes from './request.routes.js';
import { requireCollection } from '../middleware/collection.middleware.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import {
  validateCreateCollection,
  validateUpdateCollection,
} from '../validators/collection.validator.js';
import { validateExportOpenApi } from '../validators/export.validator.js';
import { validateCollectionRun } from '../validators/runner.validator.js';
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

// Export collection as OpenAPI 3.0.3 specification (JSON or YAML)
router.get(
  '/:collectionId/export/openapi',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  requireCollection,
  validateExportOpenApi,
  exportController.exportCollectionAsOpenApi
);

// Execute collection runner sequentially
router.post(
  '/:collectionId/run',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  requireCollection,
  validateCollectionRun,
  runnerController.runCollection
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

