import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: BigInt(req.user!.id) },
      orderBy: { isDefault: 'desc' },
    });

    res.status(200).json({
      data: addresses.map((a) => ({ ...a, id: a.id.toString(), userId: a.userId.toString() })),
    });
  } catch (error) {
    next(error);
  }
};

export const createAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { label, recipient_name, phone, province, city, district, postal_code, address_line, notes, latitude, longitude, is_default } = req.body;

    if (!recipient_name || !phone || !province || !city || !district || !postal_code || !address_line) {
      return next(new AppError('Please provide all required address fields', 400));
    }

    const userId = BigInt(req.user!.id);

    const addressCount = await prisma.address.count({ where: { userId } });
    const makeDefault = addressCount === 0 || is_default === true;

    if (makeDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId,
        label,
        recipientName: recipient_name,
        phone,
        province,
        city,
        district,
        postalCode: postal_code,
        addressLine: address_line,
        notes,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isDefault: makeDefault,
      },
    });

    res.status(201).json({
      data: { ...newAddress, id: newAddress.id.toString(), userId: newAddress.userId.toString() },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addressId = BigInt(String(req.params.id));
    const userId = BigInt(req.user!.id);
    const { label, recipient_name, phone, province, city, district, postal_code, address_line, notes, latitude, longitude, is_default } = req.body;

    const existing = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!existing) return next(new AppError('Address not found', 404));

    if (is_default) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id: addressId },
      data: {
        label,
        recipientName: recipient_name,
        phone,
        province,
        city,
        district,
        postalCode: postal_code,
        addressLine: address_line,
        notes,
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        isDefault: is_default,
      },
    });

    res.status(200).json({
      data: { ...updated, id: updated.id.toString(), userId: updated.userId.toString() },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addressId = BigInt(String(req.params.id));
    const userId = BigInt(req.user!.id);

    const existing = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!existing) return next(new AppError('Address not found', 404));

    await prisma.address.delete({ where: { id: addressId } });

    if (existing.isDefault) {
      const first = await prisma.address.findFirst({ where: { userId }, orderBy: { id: 'asc' } });
      if (first) {
        await prisma.address.update({ where: { id: first.id }, data: { isDefault: true } });
      }
    }

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });

    res.status(200).json({
      data: addresses.map((a) => ({ ...a, id: a.id.toString(), userId: a.userId.toString() })),
    });
  } catch (error) {
    next(error);
  }
};
