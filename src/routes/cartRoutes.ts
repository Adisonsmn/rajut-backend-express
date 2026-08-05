import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as cartController from '../controllers/cartController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', asyncHandler(cartController.getCart));
router.put('/items', asyncHandler(cartController.upsertCartItem));
router.delete('/items/:productId', asyncHandler(cartController.deleteCartItem));

export default router;
