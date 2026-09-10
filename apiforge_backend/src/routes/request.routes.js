import { Router } from 'express';
import { requestController } from '../controllers/request.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requestController.getAll);
router.post('/', requestController.create);
router.post('/execute', requestController.execute);
router.get('/:id', requestController.getById);
router.put('/:id', requestController.update);
router.delete('/:id', requestController.delete);

export default router;
