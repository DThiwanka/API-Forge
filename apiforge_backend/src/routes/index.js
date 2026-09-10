import { Router } from 'express';
import authRoutes from './auth.routes.js';
import workspaceRoutes from './workspace.routes.js';
import collectionRoutes from './collection.routes.js';
import folderRoutes from './folder.routes.js';
import requestRoutes from './request.routes.js';
import responseRoutes from './response.routes.js';
import environmentRoutes from './environment.routes.js';
import historyRoutes from './history.routes.js';
import testingRoutes from './testing.routes.js';
import importRoutes from './import.routes.js';
import exportRoutes from './export.routes.js';
import collaborationRoutes from './collaboration.routes.js';
import browserRoutes from './browser.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/collections', collectionRoutes);
router.use('/folders', folderRoutes);
router.use('/requests', requestRoutes);
router.use('/responses', responseRoutes);
router.use('/environments', environmentRoutes);
router.use('/history', historyRoutes);
router.use('/testing', testingRoutes);
router.use('/import', importRoutes);
router.use('/export', exportRoutes);
router.use('/collaboration', collaborationRoutes);
router.use('/browser', browserRoutes);

export default router;
