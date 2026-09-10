import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { config } from './config/env';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    // 1. Connect to MongoDB
    await connectDatabase(config.MONGODB_URI);

    // 2. Initialize App
    const app = createApp();

    // 3. Start Listening on HOST (0.0.0.0) and PORT
    const server = app.listen(config.PORT, config.HOST, () => {
      logger.info(
        {
          event: 'server_started',
          port: config.PORT,
          host: config.HOST,
          env: config.NODE_ENV,
          docsUrl: `http://${config.HOST === '0.0.0.0' ? 'localhost' : config.HOST}:${config.PORT}/api/docs`,
          healthUrl: `http://${config.HOST === '0.0.0.0' ? 'localhost' : config.HOST}:${config.PORT}/api/health`,
          webhookUrl: `http://${config.HOST === '0.0.0.0' ? 'localhost' : config.HOST}:${config.PORT}/api/voice/webhook`,
          callbackUrl: `http://${config.HOST === '0.0.0.0' ? 'localhost' : config.HOST}:${config.PORT}/api/voice/callback`
        },
        `Voice Agent Gateway listening at http://${config.HOST}:${config.PORT}`
      );
    });

    // Graceful Shutdown Handler
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal. Closing HTTP server and database...');
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after timeout if graceful close hangs
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      logger.error({ event: 'unhandled_rejection', error: reason?.message || reason }, 'Unhandled Promise Rejection');
    });

    process.on('uncaughtException', (error: Error) => {
      logger.fatal({ event: 'uncaught_exception', error: error.message, stack: error.stack }, 'Uncaught Exception');
      process.exit(1);
    });
  } catch (error: any) {
    logger.fatal({ event: 'bootstrap_failed', error: error.message }, 'Failed to start gateway server');
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
