import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { healthCheck } from '../controllers/healthController.js';

import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import customProductRoutes from './customProductRoutes.js';
import geocodeRoutes from './geocodeRoutes.js';

const router = Router();

router.get('/health', asyncHandler(healthCheck));

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/custom-products', customProductRoutes);
router.use('/geocode', geocodeRoutes);

export default router;
