import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

const signToken = (userId: number, role: string) => {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ userId, role }, process.env.JWT_SECRET as string, options);
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password || !fullName) {
      return next(new AppError('Please provide email, password, and full name', 400));
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError('Email is already in use', 400));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      }
    });

    const token = signToken(newUser.userId, newUser.role);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    // Check if user exists and password is correct
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    const token = signToken(user.userId, user.role);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          userId: user.userId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is set by auth middleware
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
      select: {
        userId: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        createdAt: true,
      }
    });

    if (!user) {
      return next(new AppError('User no longer exists', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
