import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { healthCheck } from '../controllers/healthController.js';

import authRoutes from './authRoutes.js';
import addressRoutes from './userRoutes.js';
import cartRoutes from './cartRoutes.js';
import storefrontRoutes from './storefrontRoutes.js';
import orderRoutes from './orderRoutes.js';
import adminRoutes from './adminRoutes.js';
import geocodeRoutes from './geocodeRoutes.js';

import * as authController from '../controllers/authController.js';
import * as orderController from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/health', asyncHandler(healthCheck));

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/logout', protect, asyncHandler(authController.logout));
router.put('/account', protect, asyncHandler(authController.updateAccount));

router.use('/auth', authRoutes);
router.use('/', storefrontRoutes);
router.use('/addresses', addressRoutes);
router.use('/cart', cartRoutes);
router.post('/checkout', protect, asyncHandler(orderController.checkout));
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/geocode', geocodeRoutes);

export default router;
