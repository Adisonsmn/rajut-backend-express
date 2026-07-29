import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as userController from '../controllers/userController.js';

const router = Router();

// TODO: Add auth middleware for all user routes

router.get('/profile', asyncHandler(userController.getProfile));
router.put('/profile', asyncHandler(userController.updateProfile));

router.get('/addresses', asyncHandler(userController.getAddresses));
router.post('/addresses', asyncHandler(userController.createAddress));
router.put('/addresses/:addressId', asyncHandler(userController.updateAddress));
router.delete('/addresses/:addressId', asyncHandler(userController.deleteAddress));

export default router;
