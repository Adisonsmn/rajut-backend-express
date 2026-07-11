import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError.js';
import { apiError } from '../lib/apiResponse.js';
import { Prisma } from '../generated/prisma/client.js';
import { ZodError } from 'zod';

const isDev = process.env['NODE_ENV'] === 'development';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json(apiError(err.message, isDev ? { stack: err.stack } : undefined));
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2025':
        res.status(404).json(apiError('Record not found'));
        return;
      case 'P2002':
        res
          .status(409)
          .json(
            apiError(
              'Data already exists (unique constraint violated)',
              isDev ? err.meta : undefined,
            ),
          );
        return;
      case 'P2003':
        res.status(400).json(apiError('Invalid reference to related data'));
        return;
      default:
        res
          .status(400)
          .json(
            apiError(
              'Database request error',
              isDev ? { code: err.code, meta: err.meta } : undefined,
            ),
          );
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json(apiError('Invalid data sent to database'));
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json(apiError('Validation failed', err.flatten().fieldErrors));
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const stack = err instanceof Error ? err.stack : undefined;

  console.error('[Unhandled Error]', { message, stack, url: req.url, method: req.method });

  res
    .status(500)
    .json(apiError(isDev ? message : 'Internal server error', isDev ? { stack } : undefined));
}
