import app from './app.js';
import { env } from './config/env.js';
import { db } from './config/database.js';
import { startBrowserCleanupJob } from './jobs/browser-cleanup.job.js';
import { env, assertValidEnv } from './config/env.js';
import { db, checkDatabaseConnection } from './config/database.js';
import { startBrowserCleanupJob, stopBrowserCleanupJob } from './jobs/browser-cleanup.job.js';
import browserSessionService from './services/browser/browser-session.service.js';
import browserService from './services/browser/browser.service.js';
import realtimeService from './services/realtime/realtime.service.js';

startBrowserCleanupJob();
let server = null;
let isShuttingDown = false;

const server = app.listen(env.PORT, () => {
  console.log(`[APIForge Backend] Running on port ${env.PORT} (${env.NODE_ENV})`);
});
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
    console.log(`[APIForge Backend] Environment validated (${env.NODE_ENV}).`);

// Initialize WebSocket collaboration server
realtimeService.init(server);
    // 2. Verify database connection
    console.log('[APIForge Backend] Connecting to database...');
    const dbStatus = await checkDatabaseConnection();
    if (!dbStatus.ok) {
      console.error(`[APIForge Backend] FATAL: Database connection failed: ${dbStatus.error}`);
      process.exit(1);
    }
    console.log('[APIForge Backend] Database connected successfully.');

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n[APIForge Backend] ${signal} received. Shutting down gracefully...`);
  try {
    realtimeService.close();
  } catch (wsErr) {
    console.error('[APIForge Backend] Error closing WebSocket server:', wsErr);
    // 3. Start HTTP server
    server = app.listen(env.PORT, () => {
      console.log(`[APIForge Backend] Server listening on port ${env.PORT} (${env.NODE_ENV})`);
    });

    // 4. Initialize WebSocket collaboration server
    realtimeService.init(server);
    console.log('[APIForge Backend] Realtime WebSocket server initialized on /ws.');

    // 5. Start background jobs
    startBrowserCleanupJob();
    console.log('[APIForge Backend] Browser session cleanup job started.');

    return server;
  } catch (err) {
    console.error(`[APIForge Backend] FATAL: Startup sequence aborted:\n${err.message}`);
    process.exit(1);
  }
}

  server.close(async () => {
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

  console.log(`\n[APIForge Backend] ${signal} received. Initiating graceful shutdown...`);

  // Bounded timeout: force exit if cleanup takes longer than SHUTDOWN_TIMEOUT_MS
  const forceTimer = setTimeout(() => {
    console.error(`[APIForge Backend] Forcefully terminating: shutdown exceeded ${env.SHUTDOWN_TIMEOUT_MS}ms timeout.`);
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
      if (db?.$disconnect) {
        await db.$disconnect();
      }
      console.log('[APIForge Backend] Server and database connections closed.');
      process.exit(0);
    } catch (err) {
      console.error('[APIForge Backend] Error during shutdown:', err);
      process.exit(1);
      await browserSessionService.clearAllSessions();
      await browserService.shutdownBrowserService();
    } catch (browserErr) {
      console.error('[APIForge Backend] Error closing browser sessions:', browserErr?.message);
    }
  });
};

    // 3. Close WebSocket server and disconnect clients
    try {
      realtimeService.close();
    } catch (wsErr) {
      console.error('[APIForge Backend] Error closing WebSocket server:', wsErr?.message);
    }

    // 4. Close HTTP server
    if (server) {
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            console.error('[APIForge Backend] Error closing HTTP server:', err?.message);
          }
          resolve();
        });
      });
    }

    // 5. Disconnect Database
    if (db?.$disconnect) {
      await db.$disconnect();
    }

    console.log('[APIForge Backend] Graceful shutdown completed cleanly.');
    clearTimeout(forceTimer);
    process.exit(0);
  } catch (err) {
    console.error('[APIForge Backend] Error during shutdown:', err);
    clearTimeout(forceTimer);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Execute startup
startServer();

export default server;
