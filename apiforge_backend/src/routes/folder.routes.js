import { Router } from 'express';
import folderController from '../controllers/folder.controller.js';
import { requireCollection } from '../middleware/collection.middleware.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import {
  validateCreateFolder,
  validateUpdateFolder,
} from '../validators/folder.validator.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

// Router with merged params so :workspaceId and :collectionId are accessible
const router = Router({ mergeParams: true });

// All folder routes require valid collection in the workspace
router.use(requireCollection);

router.post(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateCreateFolder,
  folderController.create
);

router.get(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  folderController.list
);

router.get(
  '/:folderId',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  folderController.getById
);

router.patch(
  '/:folderId',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateUpdateFolder,
  folderController.update
);

router.delete(
  '/:folderId',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  folderController.deleteFolder
);

export default router;

