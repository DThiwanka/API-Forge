import app from './app.js';
import { env, assertValidEnv } from './config/env.js';
import { db, checkDatabaseConnection } from './config/database.js';
import { startBrowserCleanupJob, stopBrowserCleanupJob } from './jobs/browser-cleanup.job.js';
import browserSessionService from './services/browser/browser-session.service.js';
import browserService from './services/browser/browser.service.js';
import realtimeService from './services/realtime/realtime.service.js';
import { logger } from './utils/logger.js';

let server = null;
let isShuttingDown = false;

/**
 * Deterministic application startup sequence:
 * 1. Validate environment configuration
 * 2. Verify database connectivity
 * 3. Start HTTP server
 * 4. Attach WebSocket collaboration server
 * 5. Start background jobs
 */
async function startServer() {
  try {
    // 1. Validate configuration
    assertValidEnv(env);
    logger.info(`[APIForge Backend] Environment validated (${env.NODE_ENV}).`);

    // 2. Verify database connection
    logger.info('[APIForge Backend] Connecting to database...');
    const dbStatus = await checkDatabaseConnection();
    if (!dbStatus.ok) {
      logger.error(`[APIForge Backend] FATAL: Database connection failed: ${dbStatus.error}`);
      process.exit(1);
    }
    logger.info('[APIForge Backend] Database connected successfully.');

    // 3. Start HTTP server
    server = app.listen(env.PORT, () => {
      logger.info(`[APIForge Backend] Server listening on port ${env.PORT} (${env.NODE_ENV})`);
    });

    // 4. Initialize WebSocket collaboration server
    realtimeService.init(server);
    logger.info('[APIForge Backend] Realtime WebSocket server initialized on /ws.');

    // 5. Start background jobs
    startBrowserCleanupJob();
    logger.info('[APIForge Backend] Browser session cleanup job started.');

    return server;
  } catch (err) {
    logger.error(`[APIForge Backend] FATAL: Startup sequence aborted:\n${err.message}`);
    process.exit(1);
  }
}

/**
 * Coordinated graceful shutdown:
 * 1. Stop accepting new HTTP requests
 * 2. Close active WebSocket connections
 * 3. Stop browser sessions and cleanup jobs
 * 4. Disconnect Prisma
 * 5. Terminate cleanly
 */
export async function shutdown(signal = 'SIGTERM') {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[APIForge Backend] ${signal} received. Initiating graceful shutdown...`);

  // Bounded timeout: force exit if cleanup takes longer than SHUTDOWN_TIMEOUT_MS
  const forceTimer = setTimeout(() => {
    logger.error(`[APIForge Backend] Forcefully terminating: shutdown exceeded ${env.SHUTDOWN_TIMEOUT_MS}ms timeout.`);
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);

  if (forceTimer.unref) {
    forceTimer.unref();
  }

  try {
    // 1. Stop background jobs
    stopBrowserCleanupJob();

    // 2. Close active browser sessions
    try {
      await browserSessionService.clearAllSessions();
      await browserService.shutdownBrowserService();
    } catch (browserErr) {
      logger.error('[APIForge Backend] Error closing browser sessions:', browserErr?.message);
    }

    // 3. Close WebSocket server and disconnect clients
    try {
      realtimeService.close();
    } catch (wsErr) {
      logger.error('[APIForge Backend] Error closing WebSocket server:', wsErr?.message);
    }

    // 4. Close HTTP server
    if (server) {
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            logger.error('[APIForge Backend] Error closing HTTP server:', err?.message);
          }
          resolve();
        });
      });
    }

    // 5. Disconnect Database
    if (db?.$disconnect) {
      await db.$disconnect();
    }

    logger.info('[APIForge Backend] Graceful shutdown completed cleanly.');
    clearTimeout(forceTimer);
    process.exit(0);
  } catch (err) {
    logger.error('[APIForge Backend] Error during shutdown:', err);
    clearTimeout(forceTimer);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Execute startup
startServer();

export default server;
