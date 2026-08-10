import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getAllCategories } from '../controllers/categoryController.js';

const router = Router();

router.get('/', asyncHandler(getAllCategories));

export default router;
