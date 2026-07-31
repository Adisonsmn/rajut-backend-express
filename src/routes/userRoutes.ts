import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as userController from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', asyncHandler(userController.getAddresses));
router.post('/', asyncHandler(userController.createAddress));
router.put('/:id', asyncHandler(userController.updateAddress));
router.delete('/:id', asyncHandler(userController.deleteAddress));

export default router;
