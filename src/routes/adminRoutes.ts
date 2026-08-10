import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/asyncHandler.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import * as adminController from '../controllers/adminController.js';
import * as productController from '../controllers/productController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect, restrictTo('ADMIN'));

router.post('/uploads', upload.single('image'), asyncHandler(adminController.uploadAsset));

// Admin product routes
router.get('/products/:id', asyncHandler(productController.getProductById));
router.post('/products', upload.array('images', 10), asyncHandler(productController.addProduct));
router.put('/products/:id', upload.array('images', 10), asyncHandler(productController.updateProduct));
router.delete('/products/:id', asyncHandler(productController.deleteProduct));
router.delete('/products/:id/images/:imgId', asyncHandler(productController.deleteProductImage));

// Admin category routes
router.post('/categories', asyncHandler(adminController.createCategory));
router.put('/categories/:id', asyncHandler(adminController.updateCategory));
router.delete('/categories/:id', asyncHandler(adminController.deleteCategory));

// Admin promo routes
router.get('/promos', asyncHandler(adminController.getAdminPromos));
router.post('/promos', asyncHandler(adminController.createPromo));
router.delete('/promos/:id', asyncHandler(adminController.deletePromo));

// Admin custom requests routes
router.get('/custom-requests', asyncHandler(adminController.getAdminCustomRequests));
router.post('/custom-requests/:id/respond', asyncHandler(adminController.respondCustomRequest));

// Admin site settings routes
router.put('/site-settings', asyncHandler(adminController.updateSiteSettings));

// Admin order & payment routes
router.get('/orders', asyncHandler(adminController.getAdminOrders));
router.patch('/transactions/:id/status', asyncHandler(adminController.updateTransactionStatus));
router.patch('/payments/:id', asyncHandler(adminController.updatePaymentStatus));

export default router;
