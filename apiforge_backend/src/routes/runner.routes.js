import { Router } from 'express';
import runnerController from '../controllers/runner.controller.js';
import { requireCollection } from '../middleware/collection.middleware.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import { validateCollectionRun } from '../validators/runner.validator.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

const router = Router({ mergeParams: true });

router.post(
  '/:collectionId/run',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  requireCollection,
  validateCollectionRun,
  runnerController.runCollection
);

export default router;

