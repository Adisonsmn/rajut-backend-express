import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

export const getActivePromos = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const promos = await prisma.promo.findMany({
      where: {
        OR: [
          { validUntil: null },
          { validUntil: { gte: today } }
        ]
      }
    });
    res.status(200).json({ status: 'success', results: promos.length, data: { promos } });
  } catch (error) {
    next(error);
  }
};
