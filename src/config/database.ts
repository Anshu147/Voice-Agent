import mongoose from 'mongoose';
import { config } from './env';
import { logger } from '../utils/logger';

export async function connectDatabase(uri: string = config.MONGODB_URI): Promise<typeof mongoose> {
  try {
    mongoose.connection.on('connected', () => {
      logger.info({ event: 'database_connected', uri: uri.replace(/\/\/[^@]+@/, '//***:***@') }, 'Connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ event: 'database_error', error: err.message }, 'MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn({ event: 'database_disconnected' }, 'MongoDB connection disconnected');
    });

    return await mongoose.connect(uri, {
      autoIndex: true
    });
  } catch (error: any) {
    logger.error({ event: 'database_connection_failed', error: error.message }, 'Failed to connect to MongoDB');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info({ event: 'database_closed' }, 'MongoDB connection closed gracefully');
  } catch (error: any) {
    logger.error({ event: 'database_close_error', error: error.message }, 'Error closing MongoDB connection');
  }
}
