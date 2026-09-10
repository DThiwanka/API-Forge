import { Router } from 'express';
import { folderController } from '../controllers/folder.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/', folderController.create);
router.get('/:id', folderController.getById);
router.put('/:id', folderController.update);
router.delete('/:id', folderController.delete);

export default router;
