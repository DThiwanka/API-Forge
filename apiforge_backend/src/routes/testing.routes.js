import { Router } from 'express';
import { testingController } from '../controllers/testing.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/run', testingController.runTests);
router.get('/:requestId', testingController.getTestsByRequestId);

export default router;
