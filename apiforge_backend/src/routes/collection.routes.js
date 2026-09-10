import { Router } from 'express';
import { collectionController } from '../controllers/collection.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', collectionController.getAll);
router.post('/', collectionController.create);
router.get('/:id', collectionController.getById);
router.put('/:id', collectionController.update);
router.delete('/:id', collectionController.delete);

export default router;
