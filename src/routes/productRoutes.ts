import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as productController from '../controllers/productController.js';

const router = Router();

router.get('/', asyncHandler(productController.getAllProducts));
router.get('/:id', asyncHandler(productController.getProductById));
router.post('/', asyncHandler(productController.addProduct));
router.put('/:id', asyncHandler(productController.updateProduct));
router.delete('/:id', asyncHandler(productController.deleteProduct));

router.patch('/:id/variants/:variantId/stock', asyncHandler(productController.updateProductVariantStock));
export default router;
