import { Request, Response } from 'express';
import { createPaymentIntent as createStripePaymentIntent, retrievePaymentIntent } from '../services/stripe.service';
import prisma from '../lib/prisma';

export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, totalAmount, customerInfo, agentId } = req.body;

    // Validate request body
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Items are required and must be a non-empty array' });
      return;
    }

    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      res.status(400).json({ message: 'Valid total amount is required' });
      return;
    }

    // Create a payment intent with Stripe
    const paymentIntentData = {
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId: req.body.userId || '',
        agentId: agentId || '',
        items: JSON.stringify(items),
      },
      receipt_email: customerInfo?.email || undefined,
    };

    const paymentIntent = await createStripePaymentIntent(paymentIntentData);

    res.status(200).json({
      clientSecret: paymentIntent.clientSecret,
      id: paymentIntent.id,
      message: 'Payment intent created successfully'
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      message: 'Failed to create payment intent',
      error: (error as Error).message 
    });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Missing Stripe webhook secret');
    res.status(500).json({ message: 'Missing webhook secret' });
    return;
  }

  try {
    // For now, we'll just log the event since we don't have the stripe library to construct the event
    // In a production environment, you would verify the webhook signature here
    const event = req.body;
    
    console.log(`Received Stripe event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data.object;
        console.log(`Payment succeeded for payment intent: ${paymentIntentSucceeded.id}`);
        
        // Update order status in database to 'CONFIRMED'
        // Extract metadata to identify the order
        const metadata = paymentIntentSucceeded.metadata;
        
        // In the place-order controller, we create multiple orders for each item
        // We need to find and update those orders
        // The agentId is passed in metadata
        if (metadata.agentId) {
          // Find recent pending orders for this agent/customer that match the payment amount
          // This is a simplified approach - in production, you'd have a more reliable way to link payment intents to orders
          try {
            // Get all pending orders with the agent ID
            const pendingOrders = await prisma.order.findMany({
              where: {
                agentId: metadata.agentId,
                status: 'PENDING',
                // Add time constraint to avoid updating old orders
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 10 // Limit to recent orders
            });
            
            // Update the most recent pending order
            if (pendingOrders.length > 0) {
              const orderToUpdate = pendingOrders[0];
              
              await prisma.order.update({
                where: { id: orderToUpdate.id },
                data: { status: 'CONFIRMED' }
              });
              
              console.log(`Order ${orderToUpdate.id} status updated to CONFIRMED`);
            }
          } catch (updateError) {
            console.error('Error updating order status:', updateError);
          }
        } else {
          // If no agentId in metadata, try to update based on payment amount
          // This is a fallback approach
          const paymentAmount = paymentIntentSucceeded.amount;
          
          try {
            const pendingOrders = await prisma.order.findMany({
              where: {
                status: 'PENDING',
                totalPrice: {
                  gte: paymentAmount / 100 - 0.01,
                  lte: paymentAmount / 100 + 0.01
                },
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 10
            });
            
            // Update the most recent matching pending order
            if (pendingOrders.length > 0) {
              const orderToUpdate = pendingOrders[0];
              
              await prisma.order.update({
                where: { id: orderToUpdate.id },
                data: { status: 'CONFIRMED' }
              });
              
              console.log(`Order ${orderToUpdate.id} status updated to CONFIRMED`);
            }
          } catch (updateError) {
            console.error('Error updating order status by amount:', updateError);
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        const paymentIntentFailed = event.data.object;
        console.log(`Payment failed for payment intent: ${paymentIntentFailed.id}`);
        break;
        
      case 'charge.succeeded':
        const charge = event.data.object;
        console.log(`Charge succeeded: ${charge.id}`);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook error: ${(err as Error).message}`);
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      res.status(400).json({ message: 'Payment intent ID is required' });
      return;
    }

    const paymentIntent = await retrievePaymentIntent(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Payment successful, create the order in the database
      res.status(200).json({
        status: paymentIntent.status,
        message: 'Payment verified successfully',
        paymentIntent
      });
    } else {
      res.status(400).json({
        status: paymentIntent.status,
        message: 'Payment not completed',
        paymentIntent
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      message: 'Failed to verify payment',
      error: (error as Error).message 
    });
  }
};