import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/AppError.js';
import { isTokenBlacklisted } from '../controllers/authController.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export const protect = (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('You are not logged in. Please log in to get access.', 401);
    }

    if (isTokenBlacklisted(token)) {
      throw new AppError('Token has been invalidated. Please log in again.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; role: string };

    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token. Please log in again.', 401));
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
