import express from 'express';
import { createPaymentIntent, handleWebhook, verifyPayment } from '../controllers/payment.controller';

const router = express.Router();

// Create a payment intent
router.post('/create-payment-intent', createPaymentIntent);

// Handle Stripe webhook events
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Verify payment status
router.post('/verify', verifyPayment);

export default router;