import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import crypto from 'crypto';

const shippingCosts: Record<string, number> = {
  pickup: 0,
  gojek: 20000,
  shopee: 15000,
  jne: 18000,
};

const formatOrder = (t: any) => {
  const totalPrice = Number(t.totalPrice || 0);
  
  const paymentsList = t.payments || [];
  const paidAmount = paymentsList
    .filter((p: any) => p.status === 'paid' || p.status === 'Paid')
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  const remainingPayment = Math.max(0, totalPrice - paidAmount);

  const items = (t.items || []).map((item: any) => ({
    id: item.transactionItemId,
    transaction_item_id: item.transactionItemId,
    variant_id: item.variantId,
    product_name: item.variant?.product?.name || 'Produk Rajut',
    quantity: item.quantity,
    price: Number(item.price || 0),
    subtotal: Number(item.price || 0) * item.quantity,
  }));

  return {
    id: t.transactionId,
    transaction_id: t.transactionId,
    user_id: t.userId,
    full_name: t.user?.fullName || '',
    customer_name: t.user?.fullName || '',
    order_number: t.orderNumber || `TRX-${t.transactionId.slice(0, 8).toUpperCase()}`,
    status: t.status || 'Pending',
    total: totalPrice,
    total_price: totalPrice,
    paid_amount: paidAmount,
    remaining_payment: remainingPayment,
    delivery_method: t.deliveryMethod || 'gojek',
    shipping_cost: Number(t.shippingCost || 0),
    promo: t.promo ? {
      promo_id: t.promo.promoId,
      promo_code: t.promo.promoCode,
      promo_name: t.promo.promoName,
    } : null,
    notes: t.notes || '',
    transaction_date: t.transactionDate,
    shipment: {
      courier: (t.deliveryMethod || 'Gojek').toUpperCase(),
      service: 'Pengiriman Standar',
    },
    address: t.address
      ? {
          address_id: t.address.addressId,
          recipient_name: t.address.receiverName,
          phone: t.address.phone,
          address_line: t.address.addressLine || t.address.address,
          street_address: t.address.addressLine || t.address.address,
          city: t.address.city,
          province: t.address.province,
          district: t.address.district,
          postal_code: t.address.postalCode,
        }
      : null,
    items,
    transaction_items: items,
    payments: paymentsList.map((p: any) => ({
      id: p.paymentId,
      payment_id: p.paymentId,
      method: p.method,
      amount: Number(p.amount || 0),
      status: p.status,
      createdAt: p.createdAt,
    })),
  };
};

export const validatePromo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promo_code, subtotal } = req.body;

    if (!promo_code) {
      res.status(400).json({ success: false, error: 'Kode promo wajib diisi' });
      return;
    }

    const codeStr = String(promo_code).trim().toUpperCase();
    const promo = await prisma.promo.findFirst({
      where: { promoCode: codeStr },
    });

    if (!promo) {
      res.status(404).json({ success: false, error: 'Kode promo tidak ditemukan' });
      return;
    }

    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
      res.status(400).json({ success: false, error: 'Kode promo sudah kedaluwarsa' });
      return;
    }

    const subtotalNum = subtotal ? parseFloat(subtotal) : 0;
    let discountAmount = 0;

    if (promo.discountAmount) {
      discountAmount = Number(promo.discountAmount);
    } else if (promo.discountPercent) {
      discountAmount = (subtotalNum * Number(promo.discountPercent)) / 100;
    }

    res.status(200).json({
      success: true,
      data: {
        promo_id: promo.promoId,
        promo_name: promo.promoName,
        promo_code: promo.promoCode,
        discount_amount: discountAmount,
        discount_percent: promo.discountPercent ? Number(promo.discountPercent) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { address_id, delivery_method, notes, promo_code } = req.body;

    const userCart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!userCart || !userCart.cartItems || userCart.cartItems.length === 0) {
      return next(new AppError('Keranjang belanja kosong', 400));
    }

    const shippingCost = shippingCosts[delivery_method] ?? 15000;
    let subtotal = 0;

    const itemsToCreate = userCart.cartItems.map(ci => {
      const price = Number(ci.variant?.product?.basePrice || 0);
      subtotal += price * ci.quantity;
      return {
        variantId: ci.variantId,
        quantity: ci.quantity,
        price,
      };
    });

    let discountAmount = 0;
    let targetPromoId: string | undefined = undefined;

    if (promo_code) {
      const codeStr = String(promo_code).trim().toUpperCase();
      const promoObj = await prisma.promo.findFirst({
        where: { promoCode: codeStr },
      });
      if (promoObj && (!promoObj.validUntil || new Date(promoObj.validUntil) >= new Date())) {
        targetPromoId = promoObj.promoId;
        if (promoObj.discountAmount) {
          discountAmount = Number(promoObj.discountAmount);
        } else if (promoObj.discountPercent) {
          discountAmount = (subtotal * Number(promoObj.discountPercent)) / 100;
        }
      }
    }

    const totalPrice = Math.max(0, subtotal + shippingCost - discountAmount);
    const transactionId = crypto.randomUUID();
    const orderNumber = `TRX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    let targetAddressId: string | undefined = undefined;
    if (address_id) {
      const addrStr = String(address_id);
      const userAddr = await prisma.userAddress.findFirst({
        where: { userId, addressId: addrStr },
      }) || await prisma.userAddress.findFirst({ where: { userId } });
      if (userAddr) targetAddressId = userAddr.addressId;
    } else {
      const defaultAddr = await prisma.userAddress.findFirst({ where: { userId, isDefault: true } })
        || await prisma.userAddress.findFirst({ where: { userId } });
      if (defaultAddr) targetAddressId = defaultAddr.addressId;
    }

    const newTransaction = await prisma.transaction.create({
      data: {
        transactionId,
        userId,
        addressId: targetAddressId,
        promoId: targetPromoId,
        orderNumber,
        deliveryMethod: delivery_method || 'gojek',
        shippingCost,
        totalPrice,
        status: 'Pending',
        notes: notes || '',
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        user: true,
        address: true,
        promo: true,
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        payments: true,
      },
    });

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { cartId: userCart.cartId },
    });

    const formatted = formatOrder(newTransaction);

    res.status(201).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        user: true,
        address: true,
        promo: true,
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        payments: true,
      },
      orderBy: { transactionDate: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: transactions.map(formatOrder),
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params['id'] as string;

    const transaction = await prisma.transaction.findFirst({
      where: {
        transactionId: orderId,
        ...(req.user!.role === 'ADMIN' ? {} : { userId }),
      },
      include: {
        user: true,
        address: true,
        promo: true,
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        payments: true,
      },
    });

    if (!transaction) {
      return next(new AppError('Pesanan tidak ditemukan', 404));
    }

    res.status(200).json({
      success: true,
      data: formatOrder(transaction),
    });
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = req.params['id'] as string;
    const { method } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { transactionId: orderId },
      include: { payments: true },
    });

    if (!transaction) {
      return next(new AppError('Pesanan tidak ditemukan', 404));
    }

    const amount = Number(transaction.totalPrice || 0);

    const payment = await prisma.payment.create({
      data: {
        transactionId: transaction.transactionId,
        method: method || 'qris',
        amount,
        status: method === 'cod' ? 'pending' : 'paid',
        payload: {
          instructions: method === 'qris'
            ? 'Pindai kode QRIS Arajut di aplikasi e-wallet kamu untuk menyelesaikan pembayaran.'
            : method === 'bank_transfer'
            ? 'Transfer ke Rekening BCA Arajut: 8830192831 a/n Arajut Official.'
            : 'Pembayaran akan dilakukan tunai saat pesanan diterima (COD).',
        },
      },
    });

    // Update transaction status & paid amount
    await prisma.transaction.update({
      where: { transactionId: transaction.transactionId },
      data: {
        status: method === 'cod' ? 'Processing' : 'Paid',
        paidAmount: method === 'cod' ? 0 : amount,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        payment_id: payment.paymentId,
        method: payment.method,
        status: payment.status,
        payload: payment.payload,
      },
    });
  } catch (error) {
    next(error);
  }
};
