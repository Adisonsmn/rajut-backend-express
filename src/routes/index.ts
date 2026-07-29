import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { healthCheck } from '../controllers/healthController.js';

import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import cartRoutes from './cartRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import promoRoutes from './promoRoutes.js';

const router = Router();

router.get('/health', asyncHandler(healthCheck));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cart', cartRoutes);
router.use('/transactions', transactionRoutes);
router.use('/promos', promoRoutes);

export default router;
