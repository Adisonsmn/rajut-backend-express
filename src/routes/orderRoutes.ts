import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as orderController from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(protect);

router.post('/checkout', asyncHandler(orderController.checkout));
router.get('/', asyncHandler(orderController.getOrders));
router.get('/:id', asyncHandler(orderController.getOrderById));
router.post('/:id/payments', asyncHandler(orderController.createPayment));

export default router;
