import { Request, Response, NextFunction } from 'express';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Dapatkan data profil user yang login
  res.status(200).json({ message: 'Get profile (not implemented)' });
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Update data diri (nama, no HP, dll)
  res.status(200).json({ message: 'Update profile (not implemented)' });
};

export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Dapatkan daftar alamat milik user
  res.status(200).json({ message: 'Get addresses (not implemented)' });
};

export const createAddress = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Buat alamat baru untuk user. Jika ini alamat pertama, set isDefault: true
  res.status(201).json({ message: 'Create address (not implemented)' });
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Edit alamat (misal: menjadikan default). Jika default, update alamat lama jadi isDefault: false
  res.status(200).json({ message: 'Update address (not implemented)' });
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Hapus alamat
  res.status(200).json({ message: 'Delete address (not implemented)' });
};
