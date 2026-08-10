import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { protect } from '../middlewares/authMiddleware.js';
import * as orderController from '../controllers/orderController.js';

const router = Router();

router.use(protect);

router.post('/promos/validate', asyncHandler(orderController.validatePromo));
router.post('/checkout', asyncHandler(orderController.createCheckout));
router.get('/orders', asyncHandler(orderController.getUserOrders));
router.get('/orders/:id', asyncHandler(orderController.getOrderById));
router.post('/orders/:id/payments', asyncHandler(orderController.createPayment));

export default router;
