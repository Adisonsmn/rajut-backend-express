import { Request, Response, NextFunction } from 'express';

export const getActivePromos = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Dapatkan daftar promo yang valid (misal: validUntil belum lewat)
  res.status(200).json({ message: 'Get active promos (not implemented)' });
};
