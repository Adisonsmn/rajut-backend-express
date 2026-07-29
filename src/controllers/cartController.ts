import { Request, Response, NextFunction } from 'express';

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Dapatkan active cart user, wajib include cartItems dan nested include ke ProductVariant & Product
  res.status(200).json({ message: 'Get cart (not implemented)' });
};

export const addItemToCart = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Menambahkan barang (variantId, quantity)
  // Cek cart ada/tidak, jika tidak ada -> buat baru. 
  // Jika variant sudah ada -> update quantity. Jika belum -> create cartItem
  res.status(201).json({ message: 'Add item to cart (not implemented)' });
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Update kuantitas barang secara spesifik
  res.status(200).json({ message: 'Update cart item (not implemented)' });
};

export const deleteCartItem = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Hapus barang dari keranjang
  res.status(200).json({ message: 'Delete cart item (not implemented)' });
};

export const applyPromo = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Validasi promoCode dan attach promoId ke Cart
  res.status(200).json({ message: 'Apply promo (not implemented)' });
};

export const removePromo = async (req: Request, res: Response, next: NextFunction) => {
  // TODO: Set promoId di Cart menjadi null
  res.status(200).json({ message: 'Remove promo (not implemented)' });
};
