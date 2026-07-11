import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { healthCheck } from '../controllers/healthController.js';

const router = Router();

router.get('/health', asyncHandler(healthCheck));

export default router;
