import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as customProductController from '../controllers/customProductController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/request', protect, asyncHandler(customProductController.getAllCustomProductRequests))
router.get('/request/:id', protect, asyncHandler(customProductController.getCustomProductRequestById));
router.post('/request', protect, restrictTo('USER'), upload.array('images', 10), asyncHandler(customProductController.addCustomProductRequest));
router.put('/request/:id', protect, restrictTo('USER'), upload.array('images', 10), asyncHandler(customProductController.updateCustomProductRequest));
router.delete('/request/:id', protect, restrictTo('USER'), asyncHandler(customProductController.deleteCustomProductRequest));
router.delete('/request/:id/images', protect, restrictTo('USER'), asyncHandler(customProductController.deleteCustomProductRequestImage));

router.get('/response/:requestId', protect, asyncHandler(customProductController.getCustomProductResponseByRequestId))
router.get('/response/:requestId/:id', protect, asyncHandler(customProductController.getCustomProductResponseById))
router.post('/response/:requestId', protect, restrictTo('ADMIN'), upload.array('images', 10), asyncHandler(customProductController.addCustomProductResponse))
router.put('/response/:requestId/:id', protect, restrictTo('ADMIN'), upload.array('images', 10), asyncHandler(customProductController.updateCustomProductResponse))
router.delete('/response/:id', protect, restrictTo('ADMIN'), asyncHandler(customProductController.deleteCustomProductResponse))
router.delete('/response/:id/images', protect, restrictTo('ADMIN'), asyncHandler(customProductController.deleteCustomProductResponseImage))

export default router;
