import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as storefrontController from '../controllers/storefrontController.js';

const router = Router();

router.get('/storefront', asyncHandler(storefrontController.getStorefront));
router.get('/products', asyncHandler(storefrontController.getProducts));
router.get('/products/:slug', asyncHandler(storefrontController.getProductBySlug));
router.get('/categories', asyncHandler(storefrontController.getCategories));
router.get('/site-settings', asyncHandler(storefrontController.getSiteSettings));

export default router;
