import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.user!.userId },
      select: { userId: true, email: true, fullName: true, phone: true, role: true, createdAt: true }
    });
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, phone } = req.body;
    const user = await prisma.user.update({
      where: { userId: req.user!.userId },
      data: { fullName, phone },
      select: { userId: true, email: true, fullName: true, phone: true, role: true, createdAt: true }
    });
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addresses = await prisma.userAddress.findMany({
      where: { userId: req.user!.userId },
      orderBy: { isDefault: 'desc' }
    });
    res.status(200).json({ status: 'success', results: addresses.length, data: { addresses } });
  } catch (error) {
    next(error);
  }
};

export const createAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiverName, phone, address, city, province, postalCode } = req.body;
    
    // Cek apakah ini alamat pertama
    const addressCount = await prisma.userAddress.count({ where: { userId: req.user!.userId } });
    const isDefault = addressCount === 0;

    const newAddress = await prisma.userAddress.create({
      data: {
        userId: req.user!.userId,
        receiverName, phone, address, city, province, postalCode,
        isDefault
      }
    });
    res.status(201).json({ status: 'success', data: { address: newAddress } });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiverName, phone, address, city, province, postalCode, isDefault } = req.body;
    const addressId = parseInt(req.params.addressId as string);

    // Cek kepemilikan alamat
    const existing = await prisma.userAddress.findFirst({ where: { addressId, userId: req.user!.userId } });
    if (!existing) return next(new AppError('Address not found', 404));

    // Jika diset default, jadikan yang lain false
    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: req.user!.userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const updatedAddress = await prisma.userAddress.update({
      where: { addressId },
      data: { receiverName, phone, address, city, province, postalCode, isDefault }
    });

    res.status(200).json({ status: 'success', data: { address: updatedAddress } });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addressId = parseInt(req.params.addressId as string);
    
    const existing = await prisma.userAddress.findFirst({ where: { addressId, userId: req.user!.userId } });
    if (!existing) return next(new AppError('Address not found', 404));

    await prisma.userAddress.delete({ where: { addressId } });
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
