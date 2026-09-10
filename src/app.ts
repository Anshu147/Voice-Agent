import cors from 'cors';
import express, { Express, Request } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { swaggerDocument } from './docs/swagger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { webhookRateLimiter } from './middleware/rateLimit.middleware';
import callbackRoutes from './routes/callback.routes';
import healthRoutes from './routes/health.routes';
import webhookRoutes from './routes/webhook.routes';
import { logger } from './utils/logger';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxies (Render, AWS ALB, Cloudflare, Nginx)
  app.set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false // Allows Swagger UI to render smoothly
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          config.ALLOWED_ORIGINS.includes('*') ||
          config.ALLOWED_ORIGINS.includes(origin)
        ) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy'));
        }
      },
      credentials: true
    })
  );

  // Body Parser with Raw Body Capture (for HMAC signature validation)
  app.use(
    express.json({
      limit: config.MAX_REQUEST_SIZE,
      verify: (req: Request, _res, buf) => {
        (req as any).rawBody = buf.toString('utf-8');
      }
    })
  );

  app.use(express.urlencoded({ extended: true, limit: config.MAX_REQUEST_SIZE }));

  // HTTP Request Logging
  if (config.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => req.url?.startsWith('/api/health') || req.url?.startsWith('/api/docs')
        },
        customLogLevel: (_req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        }
      })
    );
  }

  // Swagger Documentation Endpoint
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Health Endpoint (unprotected, unthrottled for load balancers)
  app.use('/api/health', healthRoutes);

  // Voice Gateway Endpoints (rate limited)
  app.use('/api/voice/webhook', webhookRateLimiter, webhookRoutes);
  app.use('/api/voice/callback', webhookRateLimiter, callbackRoutes);

  // 404 Route Handler
  app.use(notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
