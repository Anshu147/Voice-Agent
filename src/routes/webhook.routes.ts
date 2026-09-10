import { Router } from 'express';
import { handleWebhook } from '../controllers/webhook.controller';
import { webhookAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/', webhookAuth, handleWebhook);

export default router;
