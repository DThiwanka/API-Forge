import { Router } from 'express';
import authRoutes from './auth.routes.js';
import workspaceRoutes from './workspace.routes.js';
import { tokenInvitationRouter } from './collaboration.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
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
