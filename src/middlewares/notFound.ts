import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError.js';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
}
