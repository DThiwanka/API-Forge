import { Router } from 'express';
import { collaborationController } from '../controllers/collaboration.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/invite', collaborationController.invite);
router.get('/members/:workspaceId', collaborationController.getMembers);
router.delete('/members/:memberId', collaborationController.removeMember);

export default router;
