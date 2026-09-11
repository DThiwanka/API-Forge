import { Router } from 'express';
import importController from '../controllers/import.controller.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';
import {
  validateImportCurlPreview,
  validateImportCurlSave,
  validateImportOpenApiPreview,
  validateImportOpenApiSave,
} from '../validators/import.validator.js';

// Router with mergeParams so :workspaceId is accessible from parent router
const router = Router({ mergeParams: true });

router.post(
  '/curl/preview',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateImportCurlPreview,
  importController.previewCurl
);

router.post(
  '/curl',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateImportCurlSave,
  importController.importCurl
);

router.post(
  '/openapi/preview',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  validateImportOpenApiPreview,
  importController.previewOpenApi
);

router.post(
  '/openapi',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateImportOpenApiSave,
  importController.importOpenApi
);

export default router;

