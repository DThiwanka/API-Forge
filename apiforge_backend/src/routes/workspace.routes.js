import { Router } from 'express';
import { workspaceController } from '../controllers/workspace.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', workspaceController.getAll);
router.post('/', workspaceController.create);
router.get('/:id', workspaceController.getById);
router.put('/:id', workspaceController.update);
router.delete('/:id', workspaceController.delete);

export default router;
