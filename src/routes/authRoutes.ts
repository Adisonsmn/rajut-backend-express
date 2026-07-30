import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', protect, asyncHandler(authController.getMe));

export default router;
