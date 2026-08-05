import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as adminController from '../controllers/adminController.js';
import * as uploadController from '../controllers/uploadController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect, restrictTo('admin'));

router.get('/products/:id', asyncHandler(adminController.getProduct));
router.post('/products', asyncHandler(adminController.createProduct));
router.put('/products/:id', asyncHandler(adminController.updateProduct));
router.delete('/products/:id', asyncHandler(adminController.deleteProduct));
router.delete('/products/:id/images/:imageId', asyncHandler(adminController.deleteProductImage));

router.post('/uploads', upload.single('image'), asyncHandler(uploadController.uploadImage));

router.post('/categories', asyncHandler(adminController.createCategory));
router.put('/categories/:id', asyncHandler(adminController.updateCategory));
router.delete('/categories/:id', asyncHandler(adminController.deleteCategory));

router.put('/site-settings', asyncHandler(adminController.updateSiteSettings));

router.get('/orders', asyncHandler(adminController.getAdminOrders));
router.patch('/payments/:id', asyncHandler(adminController.updatePaymentStatus));

export default router;
