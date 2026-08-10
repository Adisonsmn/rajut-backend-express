import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as productController from '../controllers/productController.js';

import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', asyncHandler(productController.getAllProducts));
router.get('/:id', asyncHandler(productController.getProductById));
router.post('/', protect, restrictTo('ADMIN'), upload.array('images', 10), asyncHandler(productController.addProduct));
router.put('/:id', protect, restrictTo('ADMIN'), upload.array('images', 10), asyncHandler(productController.updateProduct));
router.delete('/:id', protect, restrictTo('ADMIN'), asyncHandler(productController.deleteProduct));
router.delete('/:id/images', protect, restrictTo('ADMIN'), asyncHandler(productController.deleteProductImage));

router.patch('/:id/variants/:variantId/stock', protect, restrictTo('ADMIN'), asyncHandler(productController.updateProductVariantStock));
export default router;
