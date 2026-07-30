import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as cartController from '../controllers/cartController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

// Wajib login untuk semua rute cart
router.use(protect);

router.get('/', asyncHandler(cartController.getCart));

router.post('/items', asyncHandler(cartController.addItemToCart));
router.put('/items/:cartItemId', asyncHandler(cartController.updateCartItem));
router.delete('/items/:cartItemId', asyncHandler(cartController.deleteCartItem));

router.post('/promo', asyncHandler(cartController.applyPromo));
router.delete('/promo', asyncHandler(cartController.removePromo));

export default router;
