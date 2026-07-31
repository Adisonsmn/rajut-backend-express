import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as geocodeController from '../controllers/geocodeController.js';

const router = Router();

router.get('/reverse', asyncHandler(geocodeController.reverseGeocode));

export default router;
