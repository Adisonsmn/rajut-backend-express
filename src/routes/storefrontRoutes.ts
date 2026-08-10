import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getStorefrontData } from '../controllers/storefrontController.js';

const router = Router();

router.get('/', asyncHandler(getStorefrontData));

export default router;
