import app from './app.js';
import { env } from './config/env.js';
import { db } from './config/database.js';
import { startBrowserCleanupJob } from './jobs/browser-cleanup.job.js';

startBrowserCleanupJob();

const server = app.listen(env.PORT, () => {
  console.log(`[APIForge Backend] Running on port ${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n[APIForge Backend] ${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      if (db?.$disconnect) {
        await db.$disconnect();
      }
      console.log('[APIForge Backend] Server and database connections closed.');
      process.exit(0);
    } catch (err) {
      console.error('[APIForge Backend] Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;
