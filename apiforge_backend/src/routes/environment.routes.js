import { Router } from 'express';
import environmentController from '../controllers/environment.controller.js';
import { requireEnvironment } from '../middleware/environment.middleware.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import {
  validateCreateEnvironment,
  validateUpdateEnvironment,
  validateCreateVariable,
  validateUpdateVariable,
} from '../validators/environment.validator.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

// mergeParams: true allows accessing :workspaceId from the parent router
const router = Router({ mergeParams: true });

// ==========================================
// ENVIRONMENT ROUTES
// ==========================================

router.post(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  validateCreateEnvironment,
  environmentController.create
);

router.get(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  environmentController.list
);

router.get(
  '/:environmentId',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  requireEnvironment,
  environmentController.getById
);

router.patch(
  '/:environmentId',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  requireEnvironment,
  validateUpdateEnvironment,
  environmentController.update
);

router.delete(
  '/:environmentId',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  requireEnvironment,
  environmentController.deleteEnvironment
);

router.post(
  '/:environmentId/activate',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  requireEnvironment,
  environmentController.activate
);

// ==========================================
// VARIABLE ROUTES
// ==========================================

router.post(
  '/:environmentId/variables',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  requireEnvironment,
  validateCreateVariable,
  environmentController.createVariable
);

router.get(
  '/:environmentId/variables',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  requireEnvironment,
  environmentController.listVariables
);

router.get(
  '/:environmentId/variables/:variableId',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  requireEnvironment,
  environmentController.getVariableById
);

router.patch(
  '/:environmentId/variables/:variableId',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  requireEnvironment,
  validateUpdateVariable,
  environmentController.updateVariable
);

router.delete(
  '/:environmentId/variables/:variableId',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  requireEnvironment,
  environmentController.deleteVariable
);

export default router;

