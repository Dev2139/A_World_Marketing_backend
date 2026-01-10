import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

// Note: We're using Prisma's built-in Decimal type, not importing from decimal.js

export const placeOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, referralAgentId, totalAmount, customerInfo, paymentMethod } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Order items are required' });
      return;
    }

    // Calculate total amount if not provided
    let calculatedTotal = 0;
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.price) {
        res.status(400).json({ message: 'Each item must have productId, quantity, and price' });
        return;
      }
      const itemTotal = parseFloat(String(item.price)) * item.quantity;
      calculatedTotal += itemTotal;
    }

    const finalTotal = totalAmount ? parseFloat(String(totalAmount)) : calculatedTotal;

    // Verify product availability and prices
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        res.status(404).json({ message: `Product with ID ${item.productId} not found` });
        return;
      }

      if (product.stockQuantity < item.quantity) {
        res.status(400).json({ message: `Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}` });
        return;
      }

      // Check if the price matches the current product price
      if (product.price && Math.abs(Number(product.price) - Number(item.price)) > 0.01) {
        res.status(400).json({ message: `Price mismatch for product ${product.name}` });
        return;
      }
    }

    // Create a customer based on the provided customerInfo
    // In a real implementation, this would come from the authenticated user session
    let customerId = req.body.customerId || null;
    
    if (!customerId && customerInfo) {
      // Create a customer based on the provided customerInfo
      const newCustomer = await prisma.customer.create({
        data: {
          email: `temp-${Date.now()}@example.com`, // Use timestamp to ensure uniqueness
          firstName: customerInfo.firstName || 'Guest',
          lastName: customerInfo.lastName || 'Customer',
          address: customerInfo.shippingAddress || '',
          phone: customerInfo.phone || '',
          isActive: true
        }
      });
      customerId = newCustomer.id;
    } else if (!customerId) {
      // Create a temporary customer if no customerInfo is provided
      const tempCustomer = await prisma.customer.create({
        data: {
          email: `temp-${Date.now()}@example.com`,
          firstName: 'Guest',
          lastName: 'Customer',
          isActive: true
        }
      });
      customerId = tempCustomer.id;
    }
    
    // Extract payment details
    const paymentDetails = req.body.paymentDetails || {};
    
    // Determine order status based on payment method
    const orderStatus = paymentMethod === 'card' || paymentMethod === 'upi' ? 'PENDING' : 'CONFIRMED';
    
    // Create multiple orders for each item (since schema is one product per order)
    const createdOrders = [];
    
    for (const item of items) {
      const itemTotal = parseFloat(String(item.price)) * item.quantity;
      
      const order = await prisma.order.create({
        data: {
          productId: item.productId,
          customerId: customerId,
          agentId: referralAgentId || null,
          quantity: item.quantity,
          totalPrice: itemTotal,
          status: orderStatus, // Set status based on payment method
          paymentMethod: paymentMethod,
          paymentDetails: paymentDetails,
          tax: req.body.tax ? req.body.tax : undefined,
          subtotal: req.body.subtotal ? req.body.subtotal : undefined,
          billingAddress: customerInfo?.billingAddress || undefined,
          shippingAddress: customerInfo?.shippingAddress || undefined,
        },
        include: {
          product: true,
          agent: true,
          customer: true
        }
      });
      
      // Update product stock
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity
          }
        }
      });
      
      createdOrders.push(order);
    }
    
    // If there's a referral agent, record the commission
    if (referralAgentId) {
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });

        if (product && product.commissionPercentage) {
          const commissionAmount = parseFloat(String(item.price)) * item.quantity * Number(product.commissionPercentage) / 100;
          
          // Use the first created order's ID for commission tracking
          await prisma.commission.create({
            data: {
              userId: referralAgentId,
              orderId: createdOrders[0]?.id || '',
              amount: commissionAmount,
              status: 'PENDING'
            }
          });
        }
      }
    }

    // Prepare response with the first order's ID
    const responseOrder = {
      id: createdOrders[0]?.id || '',
      totalAmount: finalTotal,
      orders: createdOrders,
      status: orderStatus
    };

    res.status(201).json({ 
      message: paymentMethod === 'stripe' ? 'Order created successfully, awaiting payment' : 'Order placed successfully', 
      orderId: responseOrder.id,
      order: responseOrder,
      paymentRequired: paymentMethod === 'stripe'
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};