import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let cart = await prisma.cart.findFirst({
      where: { userId: req.user!.userId },
      include: {
        cartItems: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        },
        promo: true
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user!.userId },
        include: { cartItems: { include: { variant: { include: { product: true } } } }, promo: true }
      });
    }

    res.status(200).json({ status: 'success', data: { cart } });
  } catch (error) {
    next(error);
  }
};

export const addItemToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variantId, quantity } = req.body;

    let cart = await prisma.cart.findFirst({ where: { userId: req.user!.userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.user!.userId } });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.cartId, variantId }
    });

    let cartItem;
    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { cartItemId: existingItem.cartItemId },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: { cartId: cart.cartId, variantId, quantity }
      });
    }

    res.status(201).json({ status: 'success', data: { cartItem } });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quantity } = req.body;
    const cartItemId = parseInt(req.params.cartItemId as string);

    const cart = await prisma.cart.findFirst({ where: { userId: req.user!.userId } });
    if (!cart) return next(new AppError('Cart not found', 404));

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartItemId, cartId: cart.cartId }
    });
    if (!existingItem) return next(new AppError('Item not found in your cart', 404));

    const cartItem = await prisma.cartItem.update({
      where: { cartItemId },
      data: { quantity }
    });

    res.status(200).json({ status: 'success', data: { cartItem } });
  } catch (error) {
    next(error);
  }
};

export const deleteCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartItemId = parseInt(req.params.cartItemId as string);

    const cart = await prisma.cart.findFirst({ where: { userId: req.user!.userId } });
    if (!cart) return next(new AppError('Cart not found', 404));

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartItemId, cartId: cart.cartId }
    });
    if (!existingItem) return next(new AppError('Item not found in your cart', 404));

    await prisma.cartItem.delete({ where: { cartItemId } });

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

export const applyPromo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promoCode } = req.body;

    const promo = await prisma.promo.findUnique({ where: { promoCode } });
    if (!promo) return next(new AppError('Promo code not found', 404));

    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
      return next(new AppError('Promo code is expired', 400));
    }

    let cart = await prisma.cart.findFirst({ where: { userId: req.user!.userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.user!.userId } });
    }

    const updatedCart = await prisma.cart.update({
      where: { cartId: cart.cartId },
      data: { promoId: promo.promoId }
    });

    res.status(200).json({ status: 'success', data: { cart: updatedCart } });
  } catch (error) {
    next(error);
  }
};

export const removePromo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await prisma.cart.findFirst({ where: { userId: req.user!.userId } });
    if (!cart) return next(new AppError('Cart not found', 404));

    const updatedCart = await prisma.cart.update({
      where: { cartId: cart.cartId },
      data: { promoId: null }
    });

    res.status(200).json({ status: 'success', data: { cart: updatedCart } });
  } catch (error) {
    next(error);
  }
};
