import { Router } from 'express';
import { responseController } from '../controllers/response.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/:id', responseController.getById);

export default router;
