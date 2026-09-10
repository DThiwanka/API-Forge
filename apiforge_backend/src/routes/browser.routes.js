import { Router } from 'express';
import { browserController } from '../controllers/browser.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/network', browserController.getNetworkLogs);
router.post('/session', browserController.createSession);

export default router;
