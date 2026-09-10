import { Router } from 'express';
import { historyController } from '../controllers/history.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', historyController.getAll);
router.delete('/', historyController.clear);
router.delete('/:id', historyController.delete);

export default router;
