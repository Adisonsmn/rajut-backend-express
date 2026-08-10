import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getSiteSettings } from '../controllers/siteSettingsController.js';

const router = Router();

router.get('/', asyncHandler(getSiteSettings));

export default router;
