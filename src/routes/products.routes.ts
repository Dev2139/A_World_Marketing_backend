import express from 'express';
import { 
  getPublicProducts,
  getProductById
} from '../controllers/product.controller';
import {
  createProductWithImages,
  addProductImages
} from '../controllers/admin.controller';

const router = express.Router();

// Public product routes (no authentication required)
router.get('/', getPublicProducts);
router.get('/:id', getProductById);

// Admin routes for managing product images (requires authentication)
// These routes should be added to admin routes instead
// router.post('/create-with-images', createProductWithImages);
// router.post('/:id/images', addProductImages);

export default router;