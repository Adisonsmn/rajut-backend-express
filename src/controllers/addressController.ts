import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

const formatAddress = (a: any) => ({
  id: a.addressId,
  addressId: a.addressId,
  label: a.label || 'Alamat',
  recipient_name: a.receiverName || '',
  receiver_name: a.receiverName || '',
  phone: a.phone || '',
  province: a.province || '',
  city: a.city || '',
  district: a.district || '',
  postal_code: a.postalCode || '',
  address_line: a.addressLine || a.address || '',
  address: a.address || a.addressLine || '',
  notes: a.notes || '',
  latitude: a.latitude ? Number(a.latitude) : null,
  longitude: a.longitude ? Number(a.longitude) : null,
  is_default: a.isDefault ?? false,
});

export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const addresses = await prisma.userAddress.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: addresses.map(formatAddress),
    });
  } catch (error) {
    next(error);
  }
};

export const createAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const {
      label,
      recipient_name,
      phone,
      province,
      city,
      district,
      postal_code,
      address_line,
      notes,
      latitude,
      longitude,
      is_default,
    } = req.body;

    if (is_default) {
      await prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.userAddress.create({
      data: {
        userId,
        label: label || 'Rumah',
        receiverName: recipient_name || req.body.receiver_name || '',
        phone,
        province,
        city,
        district,
        postalCode: postal_code || req.body.postalCode,
        addressLine: address_line || req.body.address,
        address: address_line || req.body.address || '',
        notes,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isDefault: is_default ?? false,
      },
    });

    res.status(201).json({
      success: true,
      data: formatAddress(newAddress),
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const addressId = req.params['id'] as string;
    const {
      label,
      recipient_name,
      phone,
      province,
      city,
      district,
      postal_code,
      address_line,
      notes,
      latitude,
      longitude,
      is_default,
    } = req.body;

    const existing = await prisma.userAddress.findFirst({
      where: { addressId, userId },
    });

    if (!existing) {
      return next(new AppError('Alamat tidak ditemukan', 404));
    }

    if (is_default) {
      await prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.userAddress.update({
      where: { addressId },
      data: {
        label,
        receiverName: recipient_name || req.body.receiver_name,
        phone,
        province,
        city,
        district,
        postalCode: postal_code || req.body.postalCode,
        addressLine: address_line || req.body.address,
        address: address_line || req.body.address,
        notes,
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        isDefault: is_default,
      },
    });

    res.status(200).json({
      success: true,
      data: formatAddress(updated),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const addressId = req.params['id'] as string;

    const existing = await prisma.userAddress.findFirst({
      where: { addressId, userId },
    });

    if (!existing) {
      return next(new AppError('Alamat tidak ditemukan', 404));
    }

    await prisma.userAddress.delete({ where: { addressId } });

    const remaining = await prisma.userAddress.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: remaining.map(formatAddress),
    });
  } catch (error) {
    next(error);
  }
};
