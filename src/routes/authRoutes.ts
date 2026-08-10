import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', protect, asyncHandler(authController.getMe));
router.put('/me', protect, upload.single('avatar'), asyncHandler(authController.updateAccount));

export default router;
