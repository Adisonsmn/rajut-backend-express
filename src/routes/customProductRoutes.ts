import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as customProductController from '../controllers/customProductController.js';

const router = Router();

router.get('/request', asyncHandler(customProductController.getAllCustomProductRequests))
router.get('/request/:id', asyncHandler(customProductController.getCustomProductRequestById));
router.post('/request', asyncHandler(customProductController.addCustomProductRequest));
router.put('/request/:id', asyncHandler(customProductController.updateCustomProductRequest));
router.delete('/request/:id', asyncHandler(customProductController.deleteCustomProductRequest));

router.get('/response/:requestId', asyncHandler(customProductController.getCustomProductResponseByRequestId))
router.get('/response/:requestId/:id', asyncHandler(customProductController.getCustomProductResponseById))
router.post('/response/:requestId', asyncHandler(customProductController.addCustomProductResponse))
router.put('/response/:requestId/:id', asyncHandler(customProductController.updateCustomProductResponse))
router.delete('/response/:requestId/:id', asyncHandler(customProductController.deleteCustomProductResponse))

export default router;
