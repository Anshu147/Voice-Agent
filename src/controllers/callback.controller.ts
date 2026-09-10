import { NextFunction, Request, Response } from 'express';
import { resolveAdapter } from '../adapters';
import { callbackService } from '../services/callback.service';
import { sendSuccess } from '../utils/response';
import { callbackPayloadSchema } from '../validators/voice.validator';

export async function handleCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedBody = callbackPayloadSchema.parse(req.body);
    const adapter = resolveAdapter(req);
    const result = await callbackService.processCallback(validatedBody, adapter);

    sendSuccess(
      res,
      {
        callId: result.callId,
        status: result.status,
        isNewCall: result.isNewCall
      },
      200
    );
  } catch (error) {
    next(error);
  }
}
