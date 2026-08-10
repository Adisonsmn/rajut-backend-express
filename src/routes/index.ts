import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { healthCheck } from '../controllers/healthController.js';

import authRoutes from './authRoutes.js';
import storefrontRoutes from './storefrontRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import siteSettingsRoutes from './siteSettingsRoutes.js';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';
import addressRoutes from './addressRoutes.js';
import geocodeRoutes from './geocodeRoutes.js';
import orderRoutes from './orderRoutes.js';
import customProductRoutes from './customProductRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.get('/health', asyncHandler(healthCheck));

// Auth & account aliases
router.use('/', authRoutes);
router.use('/auth', authRoutes);

// Storefront & public data
router.use('/storefront', storefrontRoutes);
router.use('/categories', categoryRoutes);
router.use('/site-settings', siteSettingsRoutes);
router.use('/products', productRoutes);

// User features (Cart, Address, Checkout, Orders)
router.use('/cart', cartRoutes);
router.use('/addresses', addressRoutes);
router.use('/geocode', geocodeRoutes);
router.use('/', orderRoutes);
router.use('/custom-products', customProductRoutes);

// Admin features
router.use('/admin', adminRoutes);

export default router;
