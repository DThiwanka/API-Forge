import { Router } from 'express';
import { importController } from '../controllers/import.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/curl', importController.importCurl);
router.post('/openapi', importController.importOpenApi);

export default router;
