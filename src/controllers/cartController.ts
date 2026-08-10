import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { formatProduct } from './productController.js';
import { AppError } from '../lib/AppError.js';

const getOrCreateUserCart = async (userId: string) => {
  let cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      cartItems: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  variants: true,
                },
              },
            },
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
            variant: {
              include: {
                product: {
                  include: {
                    variants: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  return cart;
};

const formatCartData = (cart: any) => {
  const itemsMap = new Map<string, { quantity: number; product: any }>();

  for (const item of cart.cartItems || []) {
    if (!item.variant || !item.variant.product) continue;
    const p = item.variant.product;
    const formattedP = formatProduct(p);

    if (itemsMap.has(p.productId)) {
      const existing = itemsMap.get(p.productId)!;
      existing.quantity += item.quantity;
    } else {
      itemsMap.set(p.productId, {
        quantity: item.quantity,
        product: formattedP,
      });
    }
  }

  return {
    cartId: cart.cartId,
    items: Array.from(itemsMap.values()),
  };
};

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const cart = await getOrCreateUserCart(userId);

    res.status(200).json({
      success: true,
      data: formatCartData(cart),
    });
  } catch (error) {
    next(error);
  }
};

export const upsertCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { product_id, quantity } = req.body;

    if (!product_id || quantity === undefined) {
      return next(new AppError('product_id dan quantity wajib diisi', 400));
    }

    const product = await prisma.product.findUnique({
      where: { productId: product_id },
      include: { variants: true },
    });

    if (!product) {
      return next(new AppError('Produk tidak ditemukan', 404));
    }

    let targetVariant = product.variants[0];
    if (!targetVariant) {
      targetVariant = await prisma.productVariant.create({
        data: {
          productId: product.productId,
          color: 'Standard',
          size: 'All Size',
          stock: 100,
        },
      });
    }

    const cart = await getOrCreateUserCart(userId);

    const existingCartItem = cart.cartItems.find(item => item.variant?.productId === product_id);

    if (quantity <= 0) {
      if (existingCartItem) {
        await prisma.cartItem.delete({ where: { cartItemId: existingCartItem.cartItemId } });
      }
    } else if (existingCartItem) {
      await prisma.cartItem.update({
        where: { cartItemId: existingCartItem.cartItemId },
        data: { quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.cartId,
          variantId: targetVariant.variantId,
          quantity,
        },
      });
    }

    const updatedCart = await getOrCreateUserCart(userId);

    res.status(200).json({
      success: true,
      data: formatCartData(updatedCart),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;

    const cart = await getOrCreateUserCart(userId);

    const itemsToDelete = cart.cartItems.filter(item => item.variant?.productId === productId);

    for (const item of itemsToDelete) {
      await prisma.cartItem.delete({ where: { cartItemId: item.cartItemId } });
    }

    const updatedCart = await getOrCreateUserCart(userId);

    res.status(200).json({
      success: true,
      data: formatCartData(updatedCart),
    });
  } catch (error) {
    next(error);
  }
};
