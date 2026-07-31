import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${date}-${random}`;
};

export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = BigInt(req.user!.id);
    const { address_id, delivery_method, notes } = req.body;

    if (!address_id) return next(new AppError('Please provide address_id', 400));

    const addressId = BigInt(address_id);

    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) return next(new AppError('Address not found', 404));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });
    if (!user) return next(new AppError('User not found', 404));

    const cart = await prisma.cart.findFirst({
      where: { userId, status: 'active' },
      include: {
        cartItems: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      return next(new AppError('Your cart is empty', 400));
    }

    let subtotal = 0;
    for (const item of cart.cartItems) {
      if (item.product.stock < item.quantity) {
        return next(new AppError(`Insufficient stock for "${item.product.name}"`, 400));
      }
      subtotal += Number(item.product.price) * item.quantity;
    }

    const shippingCost = delivery_method === 'pickup' ? 0 : 15000;
    const total = subtotal + shippingCost;

    const shippingAddress = {
      label: address.label,
      recipient_name: address.recipientName,
      phone: address.phone,
      address_line: address.addressLine,
      district: address.district,
      city: address.city,
      province: address.province,
      postal_code: address.postalCode,
    };

    const order = await prisma.$transaction(async (tx: any) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          addressId,
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone || '',
          shippingAddress,
          status: 'pending',
          subtotal,
          shippingCost,
          total,
          customerNotes: notes,
          placedAt: new Date(),
        },
      });

      for (const item of cart.cartItems) {
        const primaryImage = item.product.images;
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.product.name,
            productSlug: item.product.slug,
            productImage: primaryImage?.path || null,
            price: item.product.price,
            quantity: item.quantity,
            subtotal: Number(item.product.price) * item.quantity,
            availabilityType: item.product.availabilityType,
            preorderDuration: item.product.preorderDuration,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { status: 'completed' } });

      return newOrder;
    });

    res.status(201).json({
      data: { id: order.id.toString() },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = BigInt(req.user!.id);

    const orders = await prisma.order.findMany({
      where: { userId },
      include: { shipment: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      data: orders.map((o) => ({
        id: o.id.toString(),
        order_number: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        remaining_payment: o.payments.length > 0
          ? Number(o.total) - o.payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)
          : Number(o.total),
        shipment: o.shipment
          ? { courier: o.shipment.courier, service: o.shipment.service }
          : null,
        created_at: o.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = BigInt(req.user!.id);
    const orderId = BigInt(String(req.params.id));

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        payments: true,
        shipment: true,
        address: true,
      },
    });

    if (!order) return next(new AppError('Order not found', 404));

    const paidAmount = order.payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    res.status(200).json({
      data: {
        id: order.id.toString(),
        order_number: order.orderNumber,
        status: order.status,
        total: Number(order.total),
        remaining_payment: Number(order.total) - paidAmount,
        customer_notes: order.customerNotes,
        shipping_address: order.shippingAddress,
        items: order.items.map((item) => ({
          id: item.id.toString(),
          product_name: item.productName,
          quantity: item.quantity,
          subtotal: Number(item.subtotal),
          availability_type: item.availabilityType,
        })),
        payments: order.payments.map((p) => ({
          id: p.id.toString(),
          method: p.method,
          amount: Number(p.amount),
          status: p.status,
        })),
        shipment: order.shipment
          ? { courier: order.shipment.courier, service: order.shipment.service, tracking_number: order.shipment.trackingNumber, status: order.shipment.status }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = BigInt(req.user!.id);
    const orderId = BigInt(String(req.params.id));
    const { method } = req.body;

    if (!method) return next(new AppError('Please provide payment method', 400));

    const validMethods = ['qris', 'bank_transfer', 'cod'];
    if (!validMethods.includes(method)) {
      return next(new AppError(`Invalid method. Valid: ${validMethods.join(', ')}`, 400));
    }

    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) return next(new AppError('Order not found', 404));

    if (order.status === 'cancelled') {
      return next(new AppError('Cannot pay for a cancelled order', 400));
    }

    let instructions = '';
    let payload: Record<string, string> = {};

    if (method === 'qris') {
      instructions = 'Scan QR Code berikut menggunakan aplikasi dompet digital Anda (GoPay, OVO, DANA, dll). Pembayaran akan dikonfirmasi dalam 1x24 jam.';
      payload = { instructions, qr_placeholder: 'QR_CODE_IMAGE_URL_HERE' };
    } else if (method === 'bank_transfer') {
      instructions = 'Transfer ke BCA: 1234567890 a/n Arajut Store. Sertakan nomor order sebagai berita acara. Konfirmasi via WhatsApp setelah transfer.';
      payload = { instructions, bank: 'BCA', account_number: '1234567890', account_name: 'Arajut Store' };
    } else {
      instructions = 'Bayar saat barang diterima. Siapkan uang pas sejumlah total order.';
      payload = { instructions };
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        method,
        amount: order.total,
        status: 'pending',
        payload,
      },
    });

    res.status(201).json({
      data: {
        id: payment.id.toString(),
        payload: { instructions, ...payload },
      },
    });
  } catch (error) {
    next(error);
  }
};
