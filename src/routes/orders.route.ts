import express from 'express';
import { placeOrder } from '../controllers/orders/place-order.controller';

const router = express.Router();

// Place a new order
router.post('/place', placeOrder);

export default router;