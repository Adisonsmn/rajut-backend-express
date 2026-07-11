import type { Response } from 'express';
import type { ApiSuccess, ApiError } from '../types/api.js';

export function apiSuccess<T>(data: T, message?: string): ApiSuccess<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
}

export function apiError(error: string, details?: unknown): ApiError {
  const isDev = process.env['NODE_ENV'] === 'development';
  return {
    success: false,
    error,
    ...(details !== undefined && isDev ? { details } : {}),
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { statusCode?: number; message?: string } = {},
): void {
  const { statusCode = 200, message } = options;
  res.status(statusCode).json(apiSuccess(data, message));
}
