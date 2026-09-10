import { NextFunction, Request, Response } from 'express';
import { resolveAdapter } from '../adapters';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export function webhookAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.ENABLE_WEBHOOK_AUTH) {
    return next();
  }

  const adapter = resolveAdapter(req);
  const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
  const isValid = adapter.verifySignature(
    rawBody,
    req.headers,
    config.VOICE_WEBHOOK_SECRET
  );

  if (!isValid) {
    logger.warn(
      {
        event: 'auth_failed',
        path: req.path,
        ip: req.ip
      },
      'Unauthorized webhook/callback request'
    );

    sendError(
      res,
      'UNAUTHORIZED',
      'Missing or invalid authentication credentials',
      401
    );
    return;
  }

  next();
}
