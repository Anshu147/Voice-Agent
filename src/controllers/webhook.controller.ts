import { NextFunction, Request, Response } from 'express';
import { resolveAdapter } from '../adapters';
import { webhookService } from '../services/webhook.service';
import { sendSuccess } from '../utils/response';
import { webhookPayloadSchema } from '../validators/voice.validator';

export async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedBody = webhookPayloadSchema.parse(req.body);
    const adapter = resolveAdapter(req);
    const result = await webhookService.processWebhook(validatedBody, adapter);

    sendSuccess(
      res,
      {
        received: true,
        eventId: result.eventId,
        callId: result.callId,
        duplicate: result.duplicate
      },
      200
    );
  } catch (error) {
    next(error);
  }
}
