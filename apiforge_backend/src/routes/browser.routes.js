import { Router } from 'express';
import browserController from '../controllers/browser.controller.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

// Router with mergeParams so :workspaceId is accessible from parent workspace router
const router = Router({ mergeParams: true });

// Viewer and above can list/inspect sessions
router.get('/sessions', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.listSessions);
router.get('/sessions/:sessionId', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.getSession);

// Member and above can create/close sessions and interact with tabs
router.post('/sessions', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.createSession);
router.delete('/sessions/:sessionId', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.closeSession);

// Tabs management
router.post('/sessions/:sessionId/tabs', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.createTab);
router.delete('/sessions/:sessionId/tabs/:tabId', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.closeTab);

// Navigation
router.post('/sessions/:sessionId/tabs/:tabId/navigate', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.navigateTab);

// Network Activity (Step 51)
router.get('/sessions/:sessionId/network', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.getNetworkActivity);
router.get('/sessions/:sessionId/tabs/:tabId/network', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.getNetworkActivity);
router.delete('/sessions/:sessionId/tabs/:tabId/network', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.clearNetworkActivity);
router.get('/sessions/:sessionId/network/stream', requireWorkspaceRole(WORKSPACE_ROLES.VIEWER), browserController.streamNetworkActivity);

export default router;

