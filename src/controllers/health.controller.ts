import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response';

export function getHealth(_req: Request, res: Response): void {
  const dbState = mongoose.connection.readyState;
  const isDbHealthy = dbState === 1;

  sendSuccess(
    res,
    {
      status: isDbHealthy ? 'healthy' : 'degraded',
      service: 'voice-agent-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: isDbHealthy ? 'connected' : 'disconnected'
    },
    isDbHealthy ? 200 : 503
  );
}
