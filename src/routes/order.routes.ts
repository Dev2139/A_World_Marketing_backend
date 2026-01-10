import express from 'express';
import { createOrder, getOrderById } from '../controllers/order.controller';

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Orders API is working' });
});

// Create a new order
router.post('/create', createOrder);

// Get order by ID
router.get('/:id', getOrderById);

export default router;