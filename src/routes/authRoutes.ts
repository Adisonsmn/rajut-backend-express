import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', asyncHandler(authController.getMe)); // TODO: Add auth middleware

export default router;
