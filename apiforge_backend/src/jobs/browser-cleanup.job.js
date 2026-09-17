import env from '../config/env.js';
import browserSessionService from '../services/browser/browser-session.service.js';
import browserService from '../services/browser/browser.service.js';

let cleanupInterval = null;

/**
 * Starts the periodic browser session cleanup job
 */
export function startBrowserCleanupJob() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(async () => {
    try {
      const cleaned = await browserSessionService.cleanupInactiveSessions(
        env.BROWSER_SESSION_INACTIVITY_TIMEOUT_MS
      );
      if (cleaned > 0) {
        console.log(`[BrowserCleanupJob] Pruned ${cleaned} inactive browser sessions.`);
      }
    } catch (err) {
      console.error('[BrowserCleanupJob] Error pruning browser sessions:', err);
    }
  }, env.BROWSER_CLEANUP_INTERVAL_MS);

  // Allow Node.js process to exit without waiting on this interval
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  // Graceful shutdown hooks
  const handleExit = async () => {
    stopBrowserCleanupJob();
    await browserSessionService.clearAllSessions();
    await browserService.shutdownBrowserService();
  };

  process.once('SIGINT', handleExit);
  process.once('SIGTERM', handleExit);
}

/**
 * Stops the periodic browser session cleanup job
 */
export function stopBrowserCleanupJob() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

export default {
  startBrowserCleanupJob,
  stopBrowserCleanupJob,
};

