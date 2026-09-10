import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export function sendSuccess<T = any>(
  res: Response,
  data?: T,
  statusCode: number = 200,
  extra?: Record<string, any>
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    ...(data !== undefined ? (typeof data === 'object' && !Array.isArray(data) ? data : { data }) : {}),
    ...extra
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): Response {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    }
  };
  return res.status(statusCode).json(payload);
}
