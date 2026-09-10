import { Router } from 'express';
import { exportController } from '../controllers/export.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/collection/:id', exportController.exportCollection);
router.post('/curl', exportController.exportCurl);

export default router;
