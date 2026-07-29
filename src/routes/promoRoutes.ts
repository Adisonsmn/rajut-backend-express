import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as promoController from '../controllers/promoController.js';

const router = Router();

router.get('/', asyncHandler(promoController.getActivePromos));

export default router;
