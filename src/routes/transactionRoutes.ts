import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as transactionController from '../controllers/transactionController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

// Wajib login untuk melakukan transaksi
router.use(protect);

router.post('/checkout', asyncHandler(transactionController.checkout));
router.get('/', asyncHandler(transactionController.getTransactions));
router.get('/:transactionId', asyncHandler(transactionController.getTransactionById));

export default router;
