import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/AppError.js';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        role: string;
      };
    }
  }
}

export const protect = (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('You are not logged in! Please log in to get access.', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number; role: string };

    // Attach user to request object
    req.user = decoded;
    
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
