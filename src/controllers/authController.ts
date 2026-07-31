import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

const tokenBlacklist = new Set<string>();

export const isTokenBlacklisted = (token: string) => tokenBlacklist.has(token);

const signToken = (userId: bigint, role: string) => {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ userId: userId.toString(), role }, process.env.JWT_SECRET as string, options);
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, password, password_confirmation } = req.body;

    if (!name || !email || !password) {
      return next(new AppError('Please provide name, email, and password', 400));
    }

    if (password !== password_confirmation) {
      return next(new AppError('Passwords do not match', 400));
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError('Email is already in use', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: { name, email, phone, password: hashedPassword },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    const token = signToken(newUser.id, newUser.role);

    res.status(201).json({
      token,
      user: {
        id: newUser.id.toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
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

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, phone: true, role: true, password: true, isActive: true },
    });

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 403));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken(user.id, user.role);

    res.status(200).json({
      token,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) tokenBlacklist.add(token);
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user.id) },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    if (!user) return next(new AppError('User no longer exists', 404));

    res.status(200).json({
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    const { name, email, phone } = req.body;

    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: BigInt(req.user.id) } },
      });
      if (existing) return next(new AppError('Email already in use by another account', 400));
    }

    const user = await prisma.user.update({
      where: { id: BigInt(req.user.id) },
      data: { name, email, phone },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    res.status(200).json({
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
