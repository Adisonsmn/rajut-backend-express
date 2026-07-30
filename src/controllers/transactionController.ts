import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { addressId } = req.body;

    // 1. Dapatkan cart aktif
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: { include: { variant: { include: { product: true } } } },
        promo: true
      }
    });

    if (!cart || cart.cartItems.length === 0) {
      return next(new AppError('Your cart is empty', 400));
    }

    // 2. Kalkulasi ulang total
    let totalBelanja = 0;
    cart.cartItems.forEach((item: any) => {
      // Cek stok
      if (item.variant.stock < item.quantity) {
        throw new AppError(`Stock not sufficient for ${item.variant.product.name}`, 400);
      }
      totalBelanja += (Number(item.variant.product.basePrice) * item.quantity);
    });

    // 3. Terapkan promo
    let potongan = 0;
    if (cart.promo) {
      if (cart.promo.discountPercent) {
        potongan = totalBelanja * (Number(cart.promo.discountPercent) / 100);
      } else if (cart.promo.discountAmount) {
        potongan = Number(cart.promo.discountAmount);
      }
    }
    
    // Potongan tidak boleh melebihi total belanja
    if (potongan > totalBelanja) potongan = totalBelanja;
    const totalPrice = totalBelanja - potongan;

    // 4. Proses Transaksi menggunakan Prisma Transaction
    const transaction = await prisma.$transaction(async (tx: any) => {
      // Buat transaksi utama
      const newTransaction = await tx.transaction.create({
        data: {
          userId,
          promoId: cart.promoId,
          addressId,
          totalPrice,
          status: 'Pending'
        }
      });

      // Pindahkan items dan kurangi stok
      for (const item of cart.cartItems) {
        await tx.transactionItem.create({
          data: {
            transactionId: newTransaction.transactionId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.variant.product.basePrice
          }
        });

        await tx.productVariant.update({
          where: { variantId: item.variantId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // Hapus isi keranjang (atau hapus keranjang sekalian)
      await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });
      await tx.cart.update({ where: { cartId: cart.cartId }, data: { promoId: null } });

      return newTransaction;
    });

    res.status(201).json({ status: 'success', data: { transaction } });
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.userId },
      orderBy: { transactionDate: 'desc' }
    });
    res.status(200).json({ status: 'success', results: transactions.length, data: { transactions } });
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactionId = parseInt(req.params.transactionId as string);
    
    const transaction = await prisma.transaction.findFirst({
      where: { transactionId, userId: req.user!.userId },
      include: {
        address: true,
        promo: true,
        transactionItems: {
          include: {
            variant: { include: { product: true } }
          }
        }
      }
    });

    if (!transaction) return next(new AppError('Transaction not found', 404));

    res.status(200).json({ status: 'success', data: { transaction } });
  } catch (error) {
    next(error);
  }
};
