import { Router } from 'express';
import { handleCallback } from '../controllers/callback.controller';
import { webhookAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/', webhookAuth, handleCallback);

export default router;
