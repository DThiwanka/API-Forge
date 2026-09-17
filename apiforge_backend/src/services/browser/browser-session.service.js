import crypto from 'node:crypto';
import env from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { validateBrowserUrl } from './browser-url.validator.js';
import {
  createIsolatedBrowserContext,
  closeIsolatedBrowserContext,
} from './browser.service.js';

// In-memory ephemeral storage for active browser sessions
// Map<sessionId, BrowserSession>
const sessions = new Map();

/**
 * Format a session object safely for client consumption
 * Never exposes raw Playwright context, internal handles, or credentials
 */
export function formatSessionResponse(session) {
  if (!session) return null;
  return {
    id: session.id,
    workspaceId: session.workspaceId,
    activeTabId: session.activeTabId,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    tabs: session.tabs.map((tab) => ({
      id: tab.id,
      sessionId: session.id,
      url: tab.url,
      title: tab.title,
      loading: Boolean(tab.loading),
      canGoBack: Boolean(tab.canGoBack),
      canGoForward: Boolean(tab.canGoForward),
      lastStatus: tab.lastStatus || null,
      headers: tab.headers || {},
      previewContent: tab.previewContent || '',
    })),
  };
}

/**
 * Creates an isolated browser session for a workspace
 */
export async function createSession(workspaceId, userId) {
  if (!workspaceId) {
    throw new AppError('Workspace ID is required', 400);
  }

  // Enforce session limit per workspace
  const workspaceSessions = Array.from(sessions.values()).filter(
    (s) => s.workspaceId === workspaceId
  );
  if (workspaceSessions.length >= env.BROWSER_MAX_SESSIONS_PER_WORKSPACE) {
    throw new AppError(
      `Maximum concurrent browser sessions (${env.BROWSER_MAX_SESSIONS_PER_WORKSPACE}) reached for this workspace`,
      400,
      { code: 'BROWSER_SESSION_LIMIT' }
    );
  }

  const context = await createIsolatedBrowserContext();
  const page = await context.newPage();

  const sessionId = crypto.randomUUID();
  const initialTabId = crypto.randomUUID();

  const initialTab = {
    id: initialTabId,
    sessionId,
    url: '',
    title: 'New Tab',
    loading: false,
    canGoBack: false,
    canGoForward: false,
    lastStatus: null,
    headers: {},
    previewContent: '',
    page,
  };

  const session = {
    id: sessionId,
    workspaceId,
    ownerUserId: userId,
    createdAt: new Date().toISOString(),
    lastActivityAt: Date.now(),
    activeTabId: initialTabId,
    tabs: [initialTab],
    context,
  };

  sessions.set(sessionId, session);
  return formatSessionResponse(session);
}

/**
 * Lists all active browser sessions for a workspace
 */
export function getSessions(workspaceId) {
  const matching = Array.from(sessions.values()).filter(
    (s) => s.workspaceId === workspaceId
  );
  return matching.map(formatSessionResponse);
}

/**
 * Retrieves a browser session by ID with workspace authorization verification
 */
export function getSession(workspaceId, sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError('Browser session not found', 404, {
      code: 'BROWSER_SESSION_NOT_FOUND',
    });
  }

  session.lastActivityAt = Date.now();
  return formatSessionResponse(session);
}

/**
 * Closes an active browser session and disposes all isolated pages and context
 */
export async function closeSession(workspaceId, sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError('Browser session not found', 404, {
      code: 'BROWSER_SESSION_NOT_FOUND',
    });
  }

  await closeIsolatedBrowserContext(session.context);
  sessions.delete(sessionId);

  return { success: true, sessionId };
}

/**
 * Creates a new tab inside an existing session
 */
export async function createTab(workspaceId, sessionId, initialUrl = '') {
  const session = sessions.get(sessionId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError('Browser session not found', 404, {
      code: 'BROWSER_SESSION_NOT_FOUND',
    });
  }

  if (session.tabs.length >= env.BROWSER_MAX_TABS_PER_SESSION) {
    throw new AppError(
      `Maximum tabs limit (${env.BROWSER_MAX_TABS_PER_SESSION}) reached for this session`,
      400,
      { code: 'BROWSER_TAB_LIMIT' }
    );
  }

  const page = await session.context.newPage();
  const tabId = crypto.randomUUID();

  const tab = {
    id: tabId,
    sessionId,
    url: '',
    title: 'New Tab',
    loading: false,
    canGoBack: false,
    canGoForward: false,
    lastStatus: null,
    headers: {},
    previewContent: '',
    page,
  };

  session.tabs.push(tab);
  session.activeTabId = tabId;
  session.lastActivityAt = Date.now();

  if (initialUrl && initialUrl.trim()) {
    return navigateTab(workspaceId, sessionId, tabId, initialUrl, 'navigate');
  }

  return formatSessionResponse(session);
}

/**
 * Closes an individual tab inside an existing session
 */
export async function closeTab(workspaceId, sessionId, tabId) {
  const session = sessions.get(sessionId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError('Browser session not found', 404, {
      code: 'BROWSER_SESSION_NOT_FOUND',
    });
  }

  const tabIndex = session.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex === -1) {
    throw new AppError('Browser tab not found', 404, {
      code: 'BROWSER_TAB_NOT_FOUND',
    });
  }

  const [removedTab] = session.tabs.splice(tabIndex, 1);
  if (removedTab?.page) {
    try {
      await removedTab.page.close();
    } catch {
      // Ignore
    }
  }

  // If last tab was closed, create a fresh blank tab to maintain session continuity
  if (session.tabs.length === 0) {
    const page = await session.context.newPage();
    const newTabId = crypto.randomUUID();
    session.tabs.push({
      id: newTabId,
      sessionId,
      url: '',
      title: 'New Tab',
      loading: false,
      canGoBack: false,
      canGoForward: false,
      lastStatus: null,
      headers: {},
      previewContent: '',
      page,
    });
    session.activeTabId = newTabId;
  } else if (session.activeTabId === tabId) {
    // Switch active tab to adjacent tab
    const nextActive = session.tabs[Math.max(0, tabIndex - 1)];
    session.activeTabId = nextActive.id;
  }

  session.lastActivityAt = Date.now();
  return formatSessionResponse(session);
}

/**
 * Navigates a browser tab or performs history actions (back, forward, reload)
 */
export async function navigateTab(workspaceId, sessionId, tabId, targetUrl, action = 'navigate') {
  const session = sessions.get(sessionId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError('Browser session not found', 404, {
      code: 'BROWSER_SESSION_NOT_FOUND',
    });
  }

  const tab = session.tabs.find((t) => t.id === tabId);
  if (!tab) {
    throw new AppError('Browser tab not found', 404, {
      code: 'BROWSER_TAB_NOT_FOUND',
    });
  }

  session.lastActivityAt = Date.now();

  if (action === 'back') {
    if (tab.page.goBack) {
      tab.loading = true;
      try {
        await tab.page.goBack();
        tab.url = tab.page.url();
        tab.title = await tab.page.title();
      } finally {
        tab.loading = false;
      }
    }
    return formatSessionResponse(session);
  }

  if (action === 'forward') {
    if (tab.page.goForward) {
      tab.loading = true;
      try {
        await tab.page.goForward();
        tab.url = tab.page.url();
        tab.title = await tab.page.title();
      } finally {
        tab.loading = false;
      }
    }
    return formatSessionResponse(session);
  }

  if (action === 'reload') {
    if (tab.page.reload && tab.url) {
      tab.loading = true;
      try {
        await tab.page.reload();
        tab.url = tab.page.url();
        tab.title = await tab.page.title();
      } finally {
        tab.loading = false;
      }
    }
    return formatSessionResponse(session);
  }

  // Action is standard URL navigation
  const validated = await validateBrowserUrl(targetUrl, {
    allowLocalTargets: env.ALLOW_LOCAL_TARGETS,
  });

  tab.loading = true;
  try {
    const navResult = await tab.page.goto(validated.url, {
      timeout: env.BROWSER_NAVIGATION_TIMEOUT_MS,
    });

    tab.url = tab.page.url ? tab.page.url() : validated.url;
    tab.title = tab.page.title ? await tab.page.title() : validated.parsed.hostname;
    tab.lastStatus = navResult?.status ? navResult.status() : 200;
    tab.headers = navResult?.headers ? (typeof navResult.headers === 'function' ? navResult.headers() : navResult.headers) : {};
    tab.previewContent = tab.page._contentPreview || '';
    tab.canGoBack = tab.page._historyIndex > 0;
    tab.canGoForward = tab.page._historyIndex < (tab.page._history?.length - 1);
  } catch (err) {
    tab.loading = false;
    if (err.message && err.message.includes('timeout')) {
      throw new AppError(
        `Navigation timeout of ${env.BROWSER_NAVIGATION_TIMEOUT_MS}ms exceeded while reaching '${validated.url}'`,
        504,
        { code: 'BROWSER_NAVIGATION_TIMEOUT' }
      );
    }
    throw new AppError(
      `Navigation failed: ${err.message}`,
      502,
      { code: 'BROWSER_NAVIGATION_FAILED' }
    );
  } finally {
    tab.loading = false;
  }

  return formatSessionResponse(session);
}

/**
 * Removes sessions that have been inactive longer than the configured threshold
 */
export async function cleanupInactiveSessions(maxInactivityMs = env.BROWSER_SESSION_INACTIVITY_TIMEOUT_MS) {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivityAt >= maxInactivityMs) {
      try {
        await closeIsolatedBrowserContext(session.context);
      } catch {
        // Ignore
      }
      sessions.delete(sessionId);
      cleanedCount += 1;
    }
  }

  return cleanedCount;
}

/**
 * Helper to clear all sessions (for unit tests / shutdown)
 */
export async function clearAllSessions() {
  for (const session of sessions.values()) {
    try {
      await closeIsolatedBrowserContext(session.context);
    } catch {
      // Ignore
    }
  }
  sessions.clear();
}

export default {
  createSession,
  getSessions,
  getSession,
  closeSession,
  createTab,
  closeTab,
  navigateTab,
  cleanupInactiveSessions,
  clearAllSessions,
  formatSessionResponse,
};
