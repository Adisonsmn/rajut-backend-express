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

const formatUser = (user: any) => {
  const role = (user.role || 'USER').toLowerCase() === 'admin' ? 'admin' : 'customer';
  return {
    id: user.userId,
    userId: user.userId,
    name: user.fullName || user.name || '',
    fullName: user.fullName || user.name || '',
    email: user.email,
    phone: user.phone || '',
    role,
    avatarUrl: user.avatarUrl || null,
  };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.body.name || req.body.fullName;
    const email = req.body.email;
    const password = req.body.password;
    const passwordConfirm = req.body.password_confirmation || req.body.passwordConfirmation;
    const phone = req.body.phone;

    if (!name || !email || !password || !passwordConfirm) {
      return next(new AppError('Nama, email, dan kata sandi wajib diisi', 400));
    }
    
    if (password !== passwordConfirm) {
      return next(new AppError('Kata sandi dan konfirmasi kata sandi tidak cocok', 400));
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return next(new AppError('Email sudah terdaftar', 400));
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        fullName: name,
        email,
        passwordHash,
        phone,
      },
    });

    const token = signToken(newUser.userId, newUser.role);
    const formattedUser = formatUser(newUser);

    res.status(201).json({
      success: true,
      token,
      user: formattedUser,
      data: formattedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Silakan masukkan email dan kata sandi', 400));
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return next(new AppError('Email atau kata sandi salah', 401));
    }

    const token = signToken(user.userId, user.role);
    const formattedUser = formatUser(user);

    res.status(200).json({
      success: true,
      token,
      user: formattedUser,
      data: formattedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Berhasil keluar',
  });
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      return next(new AppError('Pengguna tidak ditemukan', 404));
    }

    const formattedUser = formatUser(user);

    res.status(200).json({
      success: true,
      user: formattedUser,
      data: formattedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const name = req.body.name || req.body.fullName;
    const { phone, password } = req.body;
    
    let avatarUrl = undefined;

    if (req.file) {
      try {
        avatarUrl = await uploadFileToSupabase(req.file, 'account');
      } catch (error) {
        return next(error);
      }
    }

    const updateData: any = {};
    if (name) updateData.fullName = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { userId },
      data: updateData,
    });

    const formattedUser = formatUser(updatedUser);

    res.status(200).json({
      success: true,
      user: formattedUser,
      data: formattedUser,
    });
  } catch (error) {
    next(error);
  }
};
