import { Request, Response, NextFunction } from 'express';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement register logic
  // 1. Terima email, password, fullName
  // 2. Hash password
  // 3. Simpan ke database
  res.status(201).json({ message: 'Register success (not implemented)' });
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement login logic
  // 1. Terima email, password
  // 2. Validasi dengan hash
  // 3. Generate dan return JWT
  res.status(200).json({ message: 'Login success (not implemented)' });
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement getMe logic
  // 1. Ambil data user dari JWT payload (biasanya diset di middleware)
  res.status(200).json({ message: 'Get current user (not implemented)' });
};
