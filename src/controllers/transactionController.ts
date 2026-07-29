import { Request, Response, NextFunction } from 'express';

export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Logic checkout paling kompleks
  // 1. Ambil data Cart, cartItems, promo, stok variant
  // 2. Kalkulasi ulang total secara backend
  // 3. Buat Transaction & TransactionItem dengan Prisma $transaction
  // 4. Kurangi stok ProductVariant
  // 5. Hapus Cart/CartItems
  res.status(201).json({ message: 'Checkout success (not implemented)' });
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: List riwayat transaksi milik user
  res.status(200).json({ message: 'Get transactions (not implemented)' });
};

export const getTransactionById = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Lihat detail transaksi spesifik (beserta item, alamat, promo)
  res.status(200).json({ message: 'Get transaction by ID (not implemented)' });
};
