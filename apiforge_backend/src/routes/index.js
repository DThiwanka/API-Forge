import { Router } from 'express';
import authRoutes from './auth.routes.js';
import workspaceRoutes from './workspace.routes.js';
import { tokenInvitationRouter } from './collaboration.routes.js';
import { checkDatabaseConnection } from '../config/database.js';

const router = Router();

// Health check endpoint
/**
 * Liveness Probe: Verifies the process is alive and responsive
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness Probe: Verifies the application and required backing services (database)
 * are ready to accept traffic.
 * GET /api/ready
 */
router.get('/ready', async (req, res) => {
  const dbHealth = await checkDatabaseConnection();

  if (!dbHealth.ok) {
    return res.status(503).json({
      status: 'unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    status: 'ready',
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// Workspace routes
router.use('/workspaces', workspaceRoutes);

// Public/authenticated invitation acceptance routes
router.use('/invitations', tokenInvitationRouter);

export default router;
