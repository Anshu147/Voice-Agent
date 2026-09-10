import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { sendError } from '../utils/response';

export const webhookRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'RATE_LIMIT_EXCEEDED',
      'Too many requests from this IP, please try again later.',
      429
    );
  }
});
