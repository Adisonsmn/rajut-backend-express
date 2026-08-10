import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { protect } from '../middlewares/authMiddleware.js';
import * as addressController from '../controllers/addressController.js';

const router = Router();

router.use(protect);

router.get('/', asyncHandler(addressController.getAddresses));
router.post('/', asyncHandler(addressController.createAddress));
router.put('/:id', asyncHandler(addressController.updateAddress));
router.delete('/:id', asyncHandler(addressController.deleteAddress));

export default router;
