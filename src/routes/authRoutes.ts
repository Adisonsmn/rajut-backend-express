import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/logout', protect, asyncHandler(authController.logout));
router.get('/me', protect, asyncHandler(authController.getMe));
router.put('/account', protect, asyncHandler(authController.updateAccount));

export default router;
