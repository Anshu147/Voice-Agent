import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: string, message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Syntax error from malformed JSON request body
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn({ event: 'malformed_json', error: err.message, path: req.path }, 'Malformed JSON body');
    sendError(res, 'INVALID_PAYLOAD', 'Malformed JSON payload in request body', 400);
    return;
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));

    logger.warn(
      {
        event: 'validation_error',
        path: req.path,
        errors: formattedErrors
      },
      'Payload validation failed'
    );

    sendError(
      res,
      'INVALID_PAYLOAD',
      'Validation failed for request payload',
      400,
      config.NODE_ENV !== 'production' ? formattedErrors : undefined
    );
    return;
  }

  // Explicit AppError
  if (err instanceof AppError) {
    logger.warn(
      {
        event: 'app_error',
        code: err.code,
        message: err.message,
        path: req.path
      },
      err.message
    );

    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // Payload too large error
  if (err.type === 'entity.too.large') {
    logger.warn({ event: 'payload_too_large', path: req.path }, 'Request payload too large');
    sendError(res, 'INVALID_PAYLOAD', 'Payload exceeds maximum allowed size', 413);
    return;
  }

  // Unhandled / Internal Server Error
  logger.error(
    {
      event: 'unhandled_error',
      path: req.path,
      error: err.message,
      stack: config.NODE_ENV !== 'production' ? err.stack : undefined
    },
    'Internal server error occurred'
  );

  sendError(
    res,
    'INTERNAL_ERROR',
    'An internal server error occurred',
    500
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    'NOT_FOUND',
    `Route ${req.method} ${req.originalUrl} not found`,
    404
  );
}
