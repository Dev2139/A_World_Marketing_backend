import { Request, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Order creation request received:', { items: req.body.items, totalAmount: req.body.totalAmount, agentId: req.body.agentId, customerInfo: req.body.customerInfo, subtotal: req.body.subtotal, tax: req.body.tax, shipping: req.body.shipping, paymentMethod: req.body.paymentMethod, paymentDetails: req.body.paymentDetails });
    const { items, totalAmount, agentId, customerInfo, subtotal, tax, shipping, paymentMethod, paymentDetails } = req.body;
    
    // Validate the request body
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('Validation failed: Invalid or empty items array');
      res.status(400).json({ message: 'Invalid or empty items array' });
      return;
    }
    
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      console.log('Validation failed: Invalid total amount');
      res.status(400).json({ message: 'Invalid total amount' });
      return;
    }

    // In a real implementation, you would validate the items and calculate the total
    // For now, we'll trust the frontend data since this is for testing purposes

    // Create orders for each item in the cart
    for (const item of items) {
      // Validate item data
      console.log('Validating item:', item);
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0 || typeof item.price !== 'number' || item.price < 0) {
        console.log('Item validation failed:', { productId: item.productId, quantity: item.quantity, price: item.price });
        res.status(400).json({ message: 'Invalid item data' });
        return;
      }
      
      console.log('Creating order for item:', { productId: item.productId, quantity: item.quantity, price: item.price, totalPrice: item.price * item.quantity });
      
      try {
        // Create or update customer information
        let customer = await prisma.customer.findFirst({
          where: {
            email: 'test@example.com' // Using a default email for now
          }
        });
        
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              email: 'test@example.com',
              firstName: customerInfo?.firstName || '',
              lastName: customerInfo?.lastName || '',
              address: customerInfo?.shippingAddress || '',
              phone: customerInfo?.phone || ''
            }
          });
        } else {
          // Update existing customer with new information
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              firstName: customerInfo?.firstName || customer.firstName,
              lastName: customerInfo?.lastName || customer.lastName,
              address: customerInfo?.shippingAddress || customer.address,
              phone: customerInfo?.phone || customer.phone
            }
          });
        }
        
        // Calculate the item total (price * quantity) for this specific product
        const itemTotal = new Decimal(Number(item.price) * item.quantity);
        
        // Create the order using Prisma create method to handle defaults properly
        const order = await prisma.order.create({
          data: {
            productId: item.productId,
            customerId: customer.id,
            agentId: agentId || undefined, // Use undefined instead of null to let Prisma handle optional fields
            quantity: item.quantity,
            totalPrice: itemTotal, // Use the actual item total instead of the overall total
            status: 'PENDING'
          }
        });
        
        // Update the order with additional fields after creation to avoid type issues
        await prisma.$executeRaw`
          UPDATE "Order" SET
            "subtotal" = ${subtotal ? new Decimal(subtotal.toString()) : null},
            "tax" = ${tax ? new Decimal(tax.toString()) : null},
            "shipping" = ${shipping ? new Decimal(shipping.toString()) : null},
            "paymentMethod" = ${paymentMethod || null},
            "paymentDetails" = ${paymentDetails ? JSON.stringify(paymentDetails) : null},
            "shippingAddress" = ${customerInfo?.shippingAddress || null},
            "billingAddress" = ${customerInfo?.billingAddress || null}
          WHERE "id" = ${order.id}
        `;
        
        console.log('Order created successfully for item:', { productId: item.productId, orderId: order.id });
        
        // If the order is associated with an agent, create a commission record
        if (agentId) {
          // Calculate commission (assuming 10% commission rate for demo purposes)
          const commissionAmount = (item.price * item.quantity) * 0.10;
          
          await prisma.commission.create({
            data: {
              orderId: order.id,
              userId: agentId,
              amount: new Decimal(commissionAmount.toString()),
              status: 'PENDING'
            }
          });
          
          console.log('Commission created for order:', { orderId: order.id, agentId: agentId });
        }
      } catch (error) {
        console.error('Error creating order or commission:', error);
        throw error;
      }
      

    }

    res.status(201).json({
      message: 'Orders created successfully',
      totalAmount: totalAmount
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      message: 'Internal server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code
      } : undefined
    });
  }
}

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const order = await prisma.order.findUnique({
      where: { id: String(id) },
      include: {
        product: true,
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            address: true,
            phone: true
          }
        },
        agent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    // In a real application, you would check if the user has permission to view this order
    // For now, we'll return the order details
    
    // Format the response to match the expected structure
    const orderDetails = {
      id: order.id,
      orderNumber: `ORD-${order.id.slice(-4).toUpperCase()}`, // Generate order number from ID
      status: order.status,
      totalPrice: Number(order.totalPrice),
      subtotal: order.subtotal ? Number(order.subtotal) : undefined,
      tax: order.tax ? Number(order.tax) : undefined,
      shipping: order.shipping ? Number(order.shipping) : undefined,
      paymentMethod: order.paymentMethod || undefined,
      paymentDetails: order.paymentDetails ? (typeof order.paymentDetails === 'string' ? JSON.parse(order.paymentDetails) : order.paymentDetails) : undefined,
      shippingAddress: order.shippingAddress || undefined,
      billingAddress: order.billingAddress || undefined,
      createdAt: order.createdAt.toISOString(),
      products: [{
        id: order.product.id,
        name: order.product.name,
        price: Number(order.product.price),
        quantity: order.quantity,
        image: order.product.image || undefined
      }],
      customer: {
        id: order.customer.id,
        email: order.customer.email,
        firstName: order.customer.firstName || '',
        lastName: order.customer.lastName || '',
        address: order.customer.address || '',
        phone: order.customer.phone || ''
      },
      agent: order.agent ? {
        id: order.agent.id,
        email: order.agent.email,
        firstName: order.agent.firstName || '',
        lastName: order.agent.lastName || ''
      } : undefined
    };
    
    res.status(200).json(orderDetails);
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};;