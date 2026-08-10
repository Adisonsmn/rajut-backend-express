import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import { uploadFileToSupabase } from '../lib/uploadSupabase.js';

const signToken = (userId: string, role: string) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, password, passwordConfirmation, phone } = req.body;

    if (!fullName || !email || !password || !passwordConfirmation || !phone) {
      return next(new AppError('Full name, email, and password are required', 400));
    }
    
    if (password !== passwordConfirmation) {
      return next(new AppError('Password and password confirmation do not match', 400));
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        phone,
      },
    });

    const token = signToken(newUser.userId, newUser.role);

    res.status(201).json({
      success: true,
      token,
      data: {
        userId: newUser.userId,
        fullName: newUser.fullName,
        email: newUser.email,
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
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    const token = signToken(user.userId, user.role);

    res.status(200).json({
      success: true,
      token,
      data: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      }
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { fullName, phone, password } = req.body;
    
    let avatarUrl = undefined;

    if (req.file) {
      try {
        avatarUrl = await uploadFileToSupabase(req.file, 'account');
      } catch (error) {
        return next(error);
      }
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { userId },
      data: updateData,
      select: {
        userId: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      }
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
