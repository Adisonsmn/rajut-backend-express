import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as cartController from '../controllers/cartController.js';

const router = Router();

// TODO: Add auth middleware for all cart routes

router.get('/', asyncHandler(cartController.getCart));

router.post('/items', asyncHandler(cartController.addItemToCart));
router.put('/items/:cartItemId', asyncHandler(cartController.updateCartItem));
router.delete('/items/:cartItemId', asyncHandler(cartController.deleteCartItem));

router.post('/promo', asyncHandler(cartController.applyPromo));
router.delete('/promo', asyncHandler(cartController.removePromo));

export default router;
