import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

const buildImageUrl = (path: string) =>
  path.startsWith('http')
    ? path
    : `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_PRODUCT_BUCKET}/${path}`;

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = BigInt(req.user!.id);

    let cart = await prisma.cart.findFirst({
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

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
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
    }

    res.status(200).json({
      data: {
        items: cart.cartItems.map((item) => ({
          quantity: item.quantity,
          product: {
            id: item.product.id.toString(),
            name: item.product.name,
            slug: item.product.slug,
            price: Number(item.product.price),
            stock: item.product.stock,
            images: item.product.images
              ? [{ url: buildImageUrl(item.product.images.path), is_primary: item.product.images.isPrimary }]
              : [],
          },
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const upsertCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = BigInt(req.user!.id);
    const { product_id, quantity } = req.body;

    if (!product_id || quantity === undefined) {
      return next(new AppError('Please provide product_id and quantity', 400));
    }

    const productId = BigInt(product_id);
    const qty = parseInt(quantity);

    const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
    if (!product) return next(new AppError('Product not found', 404));
    if (product.stock < qty) return next(new AppError(`Insufficient stock (available: ${product.stock})`, 400));

    let cart = await prisma.cart.findFirst({ where: { userId, status: 'active' } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    let cartItem;
    if (existing) {
      if (qty <= 0) {
        await prisma.cartItem.delete({ where: { id: existing.id } });
        return res.status(200).json({ data: { removed: true } });
      }
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: qty },
      });
    } else {
      if (qty <= 0) return next(new AppError('Quantity must be greater than 0', 400));
      cartItem = await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity: qty },
      });
    }

    res.status(200).json({
      data: { ...cartItem, id: cartItem.id.toString(), cartId: cartItem.cartId.toString(), productId: cartItem.productId.toString() },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = BigInt(req.user!.id);
    const productId = BigInt(String(req.params.productId));

    const cart = await prisma.cart.findFirst({ where: { userId, status: 'active' } });
    if (!cart) return next(new AppError('Cart not found', 404));

    const item = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });
    if (!item) return next(new AppError('Item not found in cart', 404));

    await prisma.cartItem.delete({ where: { id: item.id } });

    res.status(200).json({ data: { removed: true } });
  } catch (error) {
    next(error);
  }
};
