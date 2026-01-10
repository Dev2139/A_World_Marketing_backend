import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

export interface PaymentIntentData {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  receipt_email?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  id: string;
}

export const createPaymentIntent = async (
  paymentData: PaymentIntentData
): Promise<CreatePaymentIntentResponse> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100), // Convert to cents
      currency: paymentData.currency,
      metadata: paymentData.metadata || {},
      receipt_email: paymentData.receipt_email,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      id: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Stripe payment intent creation failed: ${(error as Error).message}`);
  }
};

export const confirmPaymentIntent = async (paymentIntentId: string) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw new Error(`Stripe payment confirmation failed: ${(error as Error).message}`);
  }
};

export const retrievePaymentIntent = async (paymentIntentId: string) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw new Error(`Stripe payment retrieval failed: ${(error as Error).message}`);
  }
};

export default stripe;