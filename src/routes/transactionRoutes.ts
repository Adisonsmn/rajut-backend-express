import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as transactionController from '../controllers/transactionController.js';

const router = Router();

// TODO: Add auth middleware for all transaction routes

router.post('/checkout', asyncHandler(transactionController.checkout));
router.get('/', asyncHandler(transactionController.getTransactions));
router.get('/:transactionId', asyncHandler(transactionController.getTransactionById));

export default router;
