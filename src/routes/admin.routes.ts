import express from 'express';
import { 
  getDashboardMetrics, 
  getDailySales, 
  getMonthlyRevenue, 
  getTopAgents,
  getProductById,
  getAllProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  createAgent,
  getAllAgents,
  updateAgentStatus,
  getAllOrders,
  getAllCommissions,
  updateCommissionStatus,
  getAllPayouts,
  updatePayoutStatus,
  getSettings,
  updateSettings,
  createProductWithImages,
  addProductImages,
  updateOrderStatus
} from '../controllers/admin.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = express.Router();

// Dashboard routes
router.get('/dashboard/metrics', requireAdmin, getDashboardMetrics);
router.get('/dashboard/daily-sales', requireAdmin, getDailySales);
router.get('/dashboard/monthly-revenue', requireAdmin, getMonthlyRevenue);
router.get('/dashboard/top-agents', requireAdmin, getTopAgents);

// Product routes
router.get('/products', requireAdmin, getAllProducts);
router.get('/products/:id', requireAdmin, getProductById);
router.post('/products', requireAdmin, createProduct);
router.post('/products-with-images', requireAdmin, createProductWithImages); // New endpoint for creating products with images
router.put('/products/:id', requireAdmin, updateProduct);
router.delete('/products/:id', requireAdmin, deleteProduct);
router.patch('/products/:id/status', requireAdmin, updateProductStatus);
router.post('/products/:id/images', requireAdmin, addProductImages); // New endpoint for adding images to existing product

// Agent routes
router.post('/agents', requireAdmin, createAgent);
router.get('/agents', requireAdmin, getAllAgents);
router.patch('/agents/:id/status', requireAdmin, updateAgentStatus);

// Order routes
router.get('/orders', requireAdmin, getAllOrders);
router.patch('/orders/:id/status', requireAdmin, updateOrderStatus);

// Commission routes
router.get('/commissions', requireAdmin, getAllCommissions);
router.patch('/commissions/:id/status', requireAdmin, updateCommissionStatus);

// Payout routes
router.get('/payouts', requireAdmin, getAllPayouts);
router.patch('/payouts/:id/status', requireAdmin, updatePayoutStatus);

// Settings routes
router.get('/settings', requireAdmin, getSettings);
router.put('/settings', requireAdmin, updateSettings);

export default router;