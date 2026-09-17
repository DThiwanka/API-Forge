import browserSessionService from '../services/browser/browser-session.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Create a new isolated browser session
 * POST /api/workspaces/:workspaceId/browser/sessions
 */
export const createSession = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const session = await browserSessionService.createSession(workspaceId, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Browser session created successfully',
    data: { session },
  });
});

/**
 * List all active browser sessions for the workspace
 * GET /api/workspaces/:workspaceId/browser/sessions
 */
export const listSessions = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const sessions = browserSessionService.getSessions(workspaceId);

  res.status(200).json({
    success: true,
    data: { sessions },
  });
});

/**
 * Get single browser session details
 * GET /api/workspaces/:workspaceId/browser/sessions/:sessionId
 */
export const getSession = asyncHandler(async (req, res) => {
  const { workspaceId, sessionId } = req.params;
  const session = browserSessionService.getSession(workspaceId, sessionId);

  res.status(200).json({
    success: true,
    data: { session },
  });
});

/**
 * Close and dispose a browser session
 * DELETE /api/workspaces/:workspaceId/browser/sessions/:sessionId
 */
export const closeSession = asyncHandler(async (req, res) => {
  const { workspaceId, sessionId } = req.params;
  const result = await browserSessionService.closeSession(workspaceId, sessionId);

  res.status(200).json({
    success: true,
    message: 'Browser session closed successfully',
    data: result,
  });
});

/**
 * Create a new tab in an existing browser session
 * POST /api/workspaces/:workspaceId/browser/sessions/:sessionId/tabs
 */
export const createTab = asyncHandler(async (req, res) => {
  const { workspaceId, sessionId } = req.params;
  const { url } = req.body || {};
  const session = await browserSessionService.createTab(workspaceId, sessionId, url);

  res.status(201).json({
    success: true,
    message: 'Browser tab created successfully',
    data: { session },
  });
});

/**
 * Close a tab in an existing browser session
 * DELETE /api/workspaces/:workspaceId/browser/sessions/:sessionId/tabs/:tabId
 */
export const closeTab = asyncHandler(async (req, res) => {
  const { workspaceId, sessionId, tabId } = req.params;
  const session = await browserSessionService.closeTab(workspaceId, sessionId, tabId);

  res.status(200).json({
    success: true,
    message: 'Browser tab closed successfully',
    data: { session },
  });
});

/**
 * Navigate a browser tab or perform history navigation (back, forward, reload)
 * POST /api/workspaces/:workspaceId/browser/sessions/:sessionId/tabs/:tabId/navigate
 */
export const navigateTab = asyncHandler(async (req, res) => {
  const { workspaceId, sessionId, tabId } = req.params;
  const { url, action = 'navigate' } = req.body || {};

  const session = await browserSessionService.navigateTab(
    workspaceId,
    sessionId,
    tabId,
    url,
    action
  );

  res.status(200).json({
    success: true,
    message: 'Navigation successful',
    data: { session },
  });
});

export default {
  createSession,
  listSessions,
  getSession,
  closeSession,
  createTab,
  closeTab,
  navigateTab,
};

