import { Router } from 'express';
import testingController from '../controllers/testing.controller.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';
import {
  validateCreateTest,
  validateUpdateTest,
  validateCreateAssertion,
  validateUpdateAssertion,
} from '../validators/testing.validator.js';

// Router with mergeParams: true so parent route params (:workspaceId, :requestId) are accessible
const router = Router({ mergeParams: true });

// Test CRUD & Execution
router.post(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateCreateTest,
  testingController.createTest
);

router.get(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  testingController.listTests
);

router.get(
  '/:testId',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  testingController.getTest
);

router.patch(
  '/:testId',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateUpdateTest,
  testingController.updateTest
);

router.delete(
  '/:testId',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  testingController.deleteTest
);

router.post(
  '/:testId/run',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  testingController.runTest
);

// Assertion CRUD
router.post(
  '/:testId/assertions',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateCreateAssertion,
  testingController.createAssertion
);

router.patch(
  '/:testId/assertions/:assertionId',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  validateUpdateAssertion,
  testingController.updateAssertion
);

router.delete(
  '/:testId/assertions/:assertionId',
  requireWorkspaceRole(WORKSPACE_ROLES.MEMBER),
  testingController.deleteAssertion
);

export default router;

