import { Router } from 'express';
import { environmentController } from '../controllers/environment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', environmentController.getAll);
router.post('/', environmentController.create);
router.get('/:id', environmentController.getById);
router.put('/:id', environmentController.update);
router.delete('/:id', environmentController.delete);

export default router;
