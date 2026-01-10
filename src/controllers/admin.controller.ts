import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';

// Dashboard metrics
export const getDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get total revenue (sum of all completed orders)
    const totalRevenueResult = await prisma.order.aggregate({
      where: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } },
      _sum: { totalPrice: true },
    });
    const totalRevenue = totalRevenueResult._sum.totalPrice?.toNumber() || 0;

    // Get total orders
    const totalOrders = await prisma.order.count();

    // Get total agents (users with role AGENT)
    const totalAgents = await prisma.user.count({
      where: { role: 'AGENT' }
    });

    // Get total customers
    const totalCustomers = await prisma.customer.count();

    // Get pending payouts
    const pendingPayouts = await prisma.payout.count({
      where: { status: 'PENDING' }
    });

    // Get pending orders
    const pendingOrders = await prisma.order.count({
      where: { status: 'PENDING' }
    });

    res.json({
      totalRevenue,
      totalOrders,
      totalAgents,
      totalCustomers,
      pendingPayouts,
      pendingOrders
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Daily sales data for chart
export const getDailySales = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get sales data for the last 7 days
    const salesData = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM("totalPrice") as sales
      FROM "Order"
      WHERE "status" IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
        AND "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt");
    ` as any[];

    // Format the data for the chart
    const formattedData = salesData.map(item => ({
      date: item.date.toISOString().split('T')[0],
      sales: parseFloat(item.sales) || 0
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Monthly revenue data for chart
export const getMonthlyRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get revenue data for the last 12 months
    const revenueData = await prisma.$queryRaw`
      SELECT 
        CONCAT(EXTRACT(YEAR FROM "createdAt"), '-', LPAD(EXTRACT(MONTH FROM "createdAt")::text, 2, '0')) as month,
        SUM("totalPrice") as revenue
      FROM "Order"
      WHERE "status" IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
        AND "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
      ORDER BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt");
    ` as any[];

    // Format the data for the chart
    const formattedData = revenueData.map(item => ({
      month: item.month,
      revenue: parseFloat(item.revenue) || 0
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Top performing agents
export const getTopAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get top 5 agents by total sales
    const topAgents = await prisma.$queryRaw`
      SELECT 
        u."id",
        u."email" as name,
        COALESCE(SUM(o."totalPrice"), 0) as sales
      FROM "User" u
      LEFT JOIN "Order" o ON u."id" = o."agentId"
      WHERE u."role" = 'AGENT'
        AND o."status" IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
      GROUP BY u."id", u."email"
      ORDER BY sales DESC
      LIMIT 5;
    ` as any[];

    // Format the data for the chart
    const formattedData = topAgents.map(item => ({
      id: item.id,
      name: item.name,
      sales: parseFloat(item.sales) || 0
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching top agents:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get a specific product by ID (admin route)
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productImages: {
          select: {
            imageUrl: true,
            isPrimary: true,
            sortOrder: true
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    
    // Convert Decimal fields to numbers for JSON serialization
    const formattedProduct = {
      ...product,
      price: Number(product.price),
      stockQuantity: Number(product.stockQuantity),
      commissionPercentage: Number(product.commissionPercentage),
      allImages: product.productImages ? product.productImages.map((img: any) => img.imageUrl) : []
    };
    
    res.json(formattedProduct);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Product management
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert Decimal fields to numbers for JSON serialization
    const formattedProducts = products.map((product: any) => ({
      ...product,
      price: Number(product.price),
      stockQuantity: Number(product.stockQuantity),
      commissionPercentage: Number(product.commissionPercentage)
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, stockQuantity, commissionPercentage, image, category } = req.body;

    // Validate required fields
    if (!name || price === undefined || stockQuantity === undefined || commissionPercentage === undefined) {
      res.status(400).json({ message: 'Missing required fields: name, price, stockQuantity, and commissionPercentage are required' });
      return;
    }

    // Ensure numeric values are properly formatted
    const productData = {
      name,
      description: description || '',
      price: parseFloat(price),
      stockQuantity: parseInt(stockQuantity),
      commissionPercentage: parseFloat(commissionPercentage),
      image: image || '',
      category: category || '',
      isActive: true  // Explicitly set to active when created
    };

    const product = await prisma.product.create({
      data: productData
    });

    res.status(201).json(product);
  } catch (error: any) {
    console.error('Error creating product:', error);
    
    // Check for specific Prisma error types
    if (error.code === 'P2002') {
      // Unique constraint failed
      res.status(400).json({ message: 'Product with this name already exists' });
    } else {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
};

// Placeholder function - temporarily disabled due to Prisma client issues
// export const addProductImages = async (req: Request, res: Response): Promise<void> => {
//   res.status(500).json({ message: 'Feature temporarily unavailable' });
// };

// Updated function that properly handles multiple images
export const addProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, images } = req.body;
    
    if (!productId || !images || !Array.isArray(images)) {
      res.status(400).json({ message: 'Product ID and images array are required' });
      return;
    }
    
    // Verify the product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!existingProduct) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    
    // Delete existing product images for this product
    await prisma.productImage.deleteMany({
      where: { productId: productId }
    });
    
    // Create new product images
    if (images.length > 0) {
      // Create the first image as primary if it's the main product image
      const productImagesData = images.map((imgUrl: string, index: number) => ({
        imageUrl: imgUrl,
        isPrimary: index === 0, // Mark first image as primary
        sortOrder: index
      }));
      
      for (const imgData of productImagesData) {
        await prisma.productImage.create({
          data: {
            productId: productId,
            imageUrl: imgData.imageUrl,
            isPrimary: imgData.isPrimary,
            sortOrder: imgData.sortOrder
          }
        });
      }
      
      // Set the first image as the main product image as well
      await prisma.product.update({
        where: { id: productId },
        data: { image: images[0] }
      });
    }
    
    // Return the updated product with all images
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        productImages: {
          select: {
            imageUrl: true,
            isPrimary: true,
            sortOrder: true
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    
    // Format the response to include allImages
    const formattedProduct = {
      ...updatedProduct,
      price: Number(updatedProduct?.price || 0),
      stockQuantity: Number(updatedProduct?.stockQuantity || 0),
      commissionPercentage: Number(updatedProduct?.commissionPercentage || 0),
      allImages: updatedProduct?.productImages ? updatedProduct?.productImages.map((img: any) => img.imageUrl) : []
    };
    
    res.status(200).json(formattedProduct);
  } catch (error) {
    console.error('Error adding product images:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// New function to create product with images (simplified to avoid Prisma relation issues)
export const createProductWithImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, stockQuantity, commissionPercentage, image, category, images } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stockQuantity,
        commissionPercentage,
        image: image || (images && images.length > 0 ? images[0] : null), // Set main image
        category,
        isActive: true  // Explicitly set to active when created
      }
    });

    // Fetch the product without including relations to avoid Prisma issues
    const createdProduct = await prisma.product.findUnique({
      where: { id: product.id }
    });

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error creating product with images:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProductStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: { isActive }
    });

    res.json(product);
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existingProduct) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Check if the product has any related orders
    const relatedOrders = await prisma.order.count({
      where: { productId: id }
    });
    
    if (relatedOrders > 0) {
      // If there are related orders, don't allow deletion
      res.status(400).json({ message: 'Cannot delete product because it has related orders. Please contact support to handle this.' });
      return;
    }

    // Delete the product and its related images
    await prisma.product.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    // Check if it's a foreign key constraint error
    if ((error as any).code === 'P2003' || (error as any).code === 'P2014') {
      res.status(400).json({ message: 'Cannot delete product due to related records' });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: (error as any).message });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, price, stockQuantity, commissionPercentage, image, category, images } = req.body;

    // First check if the product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existingProduct) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Update basic product info
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        stockQuantity: parseInt(stockQuantity),
        commissionPercentage: parseFloat(commissionPercentage),
        image,
        category
      }
    });

    // If images are provided, update the product images
    if (images && Array.isArray(images)) {
      // Delete existing product images for this product
      await prisma.productImage.deleteMany({
        where: { productId: id }
      });
      
      // Create new product images if any provided
      if (images.length > 0) {
        const productImagesData = images.map((imgUrl: string, index: number) => ({
          imageUrl: imgUrl,
          isPrimary: index === 0, // Mark first image as primary
          sortOrder: index
        }));
        
        for (const imgData of productImagesData) {
          await prisma.productImage.create({
            data: {
              productId: id,
              imageUrl: imgData.imageUrl,
              isPrimary: imgData.isPrimary,
              sortOrder: imgData.sortOrder
            }
          });
        }
        
        // Update the main product image to the first image in the array
        await prisma.product.update({
          where: { id },
          data: { image: images[0] }
        });
      }
    }

    // Return the updated product with all images
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        productImages: {
          select: {
            imageUrl: true,
            isPrimary: true,
            sortOrder: true
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    // Format the response to include allImages
    const formattedProduct = {
      ...updatedProduct,
      price: Number(updatedProduct?.price || 0),
      stockQuantity: Number(updatedProduct?.stockQuantity || 0),
      commissionPercentage: Number(updatedProduct?.commissionPercentage || 0),
      allImages: updatedProduct?.productImages ? updatedProduct?.productImages.map((img: any) => img.imageUrl) : []
    };

    res.status(200).json(formattedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    // Check if it's a Prisma error for record not found
    if ((error as any).code === 'P2025') {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.status(500).json({ message: 'Internal server error', error: (error as any).message });
  }
};

// Agent management
export const createAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, mobileNumber, bankDetails } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the new agent
    const agent = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'AGENT',
        firstName,
        lastName,
        mobileNumber,
        bankDetails
      }
    });

    // Generate a unique referral link for this agent
    const referralLink = `${process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/referral/${agent.id}`;

    res.status(201).json({
      ...agent,
      referralLink
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      include: {
        // Include related stats for each agent
        _count: {
          select: {
            orders: {
              where: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } }
            }
          }
        }
      }
    });

    // Add additional stats to each agent
    const agentsWithStats = await Promise.all(
      agents.map(async (agent: any) => {
        // Calculate total sales for this agent
        const totalSalesResult = await prisma.order.aggregate({
          where: {
            agentId: agent.id,
            status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
          },
          _sum: { totalPrice: true }
        });
        
        // Calculate total commission for this agent
        const totalCommissionResult = await prisma.commission.aggregate({
          where: {
            userId: agent.id,
            status: { in: ['APPROVED', 'PAID'] }
          },
          _sum: { amount: true }
        });

        // Generate referral link for each agent
        const referralLink = `${process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/referral/${agent.id}`;

        return {
          ...agent,
          totalReferrals: agent._count.orders,
          totalSales: totalSalesResult._sum.totalPrice?.toNumber() || 0,
          totalCommission: totalCommissionResult._sum.amount?.toNumber() || 0,
          referralLink
        };
      })
    );

    res.json(agentsWithStats);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAgentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const agent = await prisma.user.update({
      where: { id },
      data: { isActive }
    });

    res.json(agent);
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Order management
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract query parameters for filtering
    const { status } = req.query;
    
    // Build where clause based on query parameters
    const whereClause: any = {};
    if (status) {
      whereClause.status = status as string;
    }
    
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        product: true,
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            address: true
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
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Format the response to match the expected structure
    const formattedOrders = orders.map(order => {
      return {
        id: order.id,
        orderNumber: `ORD-${order.id.slice(-4).toUpperCase()}`,
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
        items: [{
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
          phone: order.customer.phone || '',
          shippingAddress: order.customer.address || ''
        },
        agent: order.agent ? {
          id: order.agent.id,
          email: order.agent.email,
          firstName: order.agent.firstName || '',
          lastName: order.agent.lastName || ''
        } : undefined
      };
    });
    
    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Commission management
export const getAllCommissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const commissions = await prisma.commission.findMany({
      include: {
        order: {
          select: {
            id: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(commissions);
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCommissionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['PENDING', 'APPROVED', 'PAID', 'BLOCKED'].includes(status)) {
      res.status(400).json({ message: 'Invalid commission status' });
      return;
    }

    const commission = await prisma.commission.update({
      where: { id },
      data: { status }
    });

    res.json(commission);
  } catch (error) {
    console.error('Error updating commission status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Payout management
export const getAllPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const payouts = await prisma.payout.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(payouts);
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePayoutStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, transactionId } = req.body;

    // Validate status
    if (!['PENDING', 'APPROVED', 'PAID', 'REJECTED'].includes(status)) {
      res.status(400).json({ message: 'Invalid payout status' });
      return;
    }

    // Get the existing payout to check if status is changing
    const existingPayout = await prisma.payout.findUnique({
      where: { id },
      include: {
        payoutCommissions: {
          include: {
            commission: true
          }
        }
      }
    });
    
    if (!existingPayout) {
      res.status(404).json({ message: 'Payout not found' });
      return;
    }

    // Update payout status
    const updateData: any = { status };
    if (transactionId) updateData.transactionId = transactionId;
    if (status === 'PAID' && !updateData.paidAt) updateData.paidAt = new Date();
    if (status === 'APPROVED' && !updateData.approvedAt) updateData.approvedAt = new Date();

    const payout = await prisma.payout.update({
      where: { id },
      data: updateData
    });

    // If the payout status is changing to APPROVED or PAID, update the linked commission statuses
    if (status === 'APPROVED' || status === 'PAID') {
      // Update all linked commissions to PAID status
      const commissionIds = existingPayout.payoutCommissions.map(pc => pc.commissionId);
      await prisma.commission.updateMany({
        where: { id: { in: commissionIds } },
        data: { status: 'PAID' }
      });
    } else if (status === 'REJECTED') {
      // If payout is being rejected, remove the payout-commission links so commissions become available again
      // Only revert commissions if the original payout was approved/paid
      if (existingPayout.status === 'APPROVED' || existingPayout.status === 'PAID') {
        const commissionIds = existingPayout.payoutCommissions.map(pc => pc.commissionId);
        await prisma.commission.updateMany({
          where: { id: { in: commissionIds } },
          data: { status: 'APPROVED' }
        });
      }
      // Also delete the payout-commission associations to free up the commissions
      await prisma.payoutCommission.deleteMany({
        where: {
          payoutId: id
        }
      });
    }

    res.json(payout);
  } catch (error) {
    console.error('Error updating payout status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a new payout request
export const createPayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId; // Get the authenticated user ID
    const { amount } = req.body;

    // Use hardcoded minimum payout threshold (same as in getSettings function)
    const minimumPayoutThreshold = 50; // $50 minimum payout threshold

    // Validate amount
    if (!amount || amount <= 0) {
      res.status(400).json({ message: 'Valid amount is required' });
      return;
    }

    // Check if amount meets minimum threshold
    if (amount < minimumPayoutThreshold) {
      res.status(400).json({ message: `Minimum payout amount is $${minimumPayoutThreshold}. Please request at least $${minimumPayoutThreshold} for payout.` });
      return;
    }

    // Calculate available commission balance similar to how the dashboard calculates it
    // Get all commissions for the user
    const allCommissions = await prisma.commission.findMany({
      where: {
        userId: userId,
        status: { in: ['PENDING', 'APPROVED', 'PAID'] }
      }
    });
    
    // Get all payout-commission associations
    const allPayoutCommissions = await prisma.payoutCommission.findMany({
      where: {
        payout: {
          userId: userId
        }
      },
      include: {
        payout: true
      }
    });
    
    // Calculate total commission value
    const totalCommissionValue = allCommissions.reduce((sum, commission) => sum + Number(commission.amount), 0);
    
    // Calculate the actual amount used in approved/paid payouts
    const usedInProcessedPayouts = allPayoutCommissions
      .filter(pc => pc.payout.status === 'APPROVED' || pc.payout.status === 'PAID')
      .reduce((sum, pc) => {
        // Add the actual payout amount, not the full commission value
        return sum + Number(pc.payout.amount);
      }, 0);
    
    // Calculate total amount requested in pending payouts
    const pendingPayoutsResult = await prisma.payout.aggregate({
      where: {
        userId: userId,
        status: 'PENDING'
      },
      _sum: { amount: true }
    });
    const totalPendingAmount = pendingPayoutsResult._sum.amount?.toNumber() || 0;
    
    // Calculate value of commissions currently linked to pending payouts
    const valueOfCommissionsInPendingPayouts = allPayoutCommissions
      .filter(pc => pc.payout.status === 'PENDING')
      .reduce((sum, pc) => {
        const commission = allCommissions.find(c => c.id === pc.commissionId);
        return sum + (commission ? Number(commission.amount) : 0);
      }, 0);
    
    // The effective used commission value is the minimum between:
    // 1. Total value of commissions linked to pending payouts
    // 2. Total amount requested in pending payouts
    const effectivePendingUsage = Math.min(valueOfCommissionsInPendingPayouts, totalPendingAmount);
    
    // Calculate total used commission value (processed + effective pending)
    const totalUsedValue = usedInProcessedPayouts + effectivePendingUsage;
    
    // Available commission is total minus used
    const totalAvailableCommission = Math.max(0, totalCommissionValue - totalUsedValue);
    
    if (amount > totalAvailableCommission) {
      res.status(400).json({ message: 'Requested amount exceeds available commission balance' });
      return;
    }
    
    // Create the payout request first
    const payout = await prisma.payout.create({
      data: {
        userId,
        amount,
        status: 'PENDING', // New payouts start as pending
      }
    });

    // Now we need to select commissions to link to this payout
    // Get all commissions for the user
    const allCommissionsForLinking = await prisma.commission.findMany({
      where: {
        userId: userId,
        status: { in: ['PENDING', 'APPROVED', 'PAID'] }
      }
    });
    
    // Get all existing payout-commission associations
    const allPayoutCommissionsForLinking = await prisma.payoutCommission.findMany({
      where: {
        payout: {
          userId: userId
        }
      },
      include: {
        payout: true
      }
    });
    
    // Calculate total commission value
    const totalCommissionValueForLinking = allCommissionsForLinking.reduce((sum, commission) => sum + Number(commission.amount), 0);
    
    // Calculate the actual amount used in approved/paid payouts
    const usedInProcessedPayoutsForLinking = allPayoutCommissionsForLinking
      .filter(pc => pc.payout.status === 'APPROVED' || pc.payout.status === 'PAID')
      .reduce((sum, pc) => {
        return sum + Number(pc.payout.amount);
      }, 0);
    
    // Calculate total amount requested in pending payouts (excluding the one we just created)
    const pendingPayoutsResultForLinking = await prisma.payout.aggregate({
      where: {
        userId: userId,
        status: 'PENDING',
        id: { not: payout.id }  // Exclude the payout we just created
      },
      _sum: { amount: true }
    });
    const totalOtherPendingAmountForLinking = pendingPayoutsResultForLinking._sum.amount?.toNumber() || 0;
    
    // Calculate value of commissions currently linked to other pending payouts
    const valueOfCommissionsInOtherPendingPayoutsForLinking = allPayoutCommissionsForLinking
      .filter(pc => pc.payout.status === 'PENDING' && pc.payout.id !== payout.id) // Exclude the payout we just created
      .reduce((sum, pc) => {
        const commission = allCommissionsForLinking.find(c => c.id === pc.commissionId);
        return sum + (commission ? Number(commission.amount) : 0);
      }, 0);
    
    // Calculate how much commission value is still available
    const effectiveOtherPendingUsageForLinking = Math.min(valueOfCommissionsInOtherPendingPayoutsForLinking, totalOtherPendingAmountForLinking);
    
    // Get available commissions (those not linked to approved/paid payouts)
    const availableCommissions = await prisma.commission.findMany({
      where: {
        userId: userId,
        status: { in: ['APPROVED', 'PENDING'] }, // Only approved or pending commissions
        // Exclude only those linked to approved/paid payouts, but allow those linked to pending
        payoutCommissions: {
          none: {
            payout: {
              status: { in: ['APPROVED', 'PAID'] }
            }
          }
        }
      },
      orderBy: { amount: 'asc' }, // Sort by smallest amount first
    });
    
    // Link commissions to this payout based on the requested amount
    // Use a best-fit approach to minimize unused commissions
    let remainingAmount = amount;
    for (const commission of availableCommissions) {
      if (remainingAmount <= 0) break;
      
      const commissionAmount = Number(commission.amount);
      const amountToLink = Math.min(commissionAmount, remainingAmount);
      
      // Create payout-commission association
      await prisma.payoutCommission.create({
        data: {
          payoutId: payout.id,
          commissionId: commission.id,
        }
      });
      
      remainingAmount -= amountToLink;
    }

    res.status(201).json(payout);
  } catch (error) {
    console.error('Error creating payout:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Settings management
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a real application, these settings would be stored in a database
    // For now, we'll return default values
    res.json({
      defaultCommissionRate: 10, // 10%
      minimumPayoutThreshold: 50, // $50
      enableAgentRegistrations: true,
      systemMaintenanceMode: false
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a real application, these settings would be stored in a database
    // For now, we'll just return a success response
    const { defaultCommissionRate, minimumPayoutThreshold, enableAgentRegistrations, systemMaintenanceMode } = req.body;
    
    // In a real application, you would save these to a database
    console.log('Settings updated:', {
      defaultCommissionRate,
      minimumPayoutThreshold,
      enableAgentRegistrations,
      systemMaintenanceMode
    });
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Agent-specific dashboard metrics
export const getAgentDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId; // Get the authenticated user ID

    // Get total referrals (orders linked to this agent)
    const totalReferrals = await prisma.order.count({
      where: { agentId: userId }
    });

    // Get total sales (sum of all completed orders)
    const totalSalesResult = await prisma.order.aggregate({
      where: {
        agentId: userId,
        status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
      },
      _sum: { totalPrice: true },
    });
    const totalSales = totalSalesResult._sum.totalPrice?.toNumber() || 0;

    // Get all commissions for the user
    const allCommissions = await prisma.commission.findMany({
      where: {
        userId: userId,
        status: { in: ['PENDING', 'APPROVED', 'PAID'] }
      }
    });
    
    // Get all payout-commission associations
    const allPayoutCommissions = await prisma.payoutCommission.findMany({
      where: {
        payout: {
          userId: userId
        }
      },
      include: {
        payout: true
      }
    });
    
    // Calculate the total commission earned by the agent
    // This represents all commissions that have been earned regardless of payout status
    const totalCommissionEarned = allCommissions.reduce((sum, commission) => sum + Number(commission.amount), 0);
    
    // Calculate total amount that has been paid out (approved or paid)
    const totalPaidOutAmount = allPayoutCommissions
      .filter(pc => pc.payout.status === 'APPROVED' || pc.payout.status === 'PAID')
      .reduce((sum, pc) => {
        return sum + Number(pc.payout.amount);
      }, 0);
    
    // Calculate total amount requested in pending payouts
    const pendingPayoutsResult = await prisma.payout.aggregate({
      where: {
        userId: userId,
        status: 'PENDING'
      },
      _sum: { amount: true }
    });
    const totalPendingAmount = pendingPayoutsResult._sum.amount?.toNumber() || 0;
    
    // Calculate value of commissions currently linked to pending payouts
    const valueOfCommissionsInPendingPayouts = allPayoutCommissions
      .filter(pc => pc.payout.status === 'PENDING')
      .reduce((sum, pc) => {
        const commission = allCommissions.find(c => c.id === pc.commissionId);
        return sum + (commission ? Number(commission.amount) : 0);
      }, 0);
    
    // The effective pending usage is the minimum between:
    // 1. Total value of commissions linked to pending payouts
    // 2. Total amount requested in pending payouts
    const effectivePendingUsage = Math.min(valueOfCommissionsInPendingPayouts, totalPendingAmount);
    
    // Calculate available commission (not yet paid out or tied up in pending requests)
    // This represents the commission amount that can still be requested for payout
    const totalCommission = Math.max(0, totalCommissionEarned - totalPaidOutAmount - effectivePendingUsage);

    // Get pending payouts
    const pendingPayouts = await prisma.payout.count({
      where: {
        userId: userId,
        status: 'PENDING'
      }
    });

    // Get total earnings from approved and paid payouts
    const totalEarningsResult = await prisma.payout.aggregate({
      where: {
        userId: userId,
        status: { in: ['APPROVED', 'PAID'] }
      },
      _sum: { amount: true }
    });
    const totalEarnings = totalEarningsResult._sum.amount?.toNumber() || 0;

    res.json({
      totalReferrals,
      totalSales,
      totalCommission,
      pendingPayouts,
      totalEarnings
    });
  } catch (error) {
    console.error('Error fetching agent dashboard metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Agent-specific API endpoints
export const getAgentReferrals = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId; // Get the authenticated user ID

    const referrals = await prisma.order.findMany({
      where: { agentId: userId },
      include: {
        product: true,
        customer: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(referrals);
  } catch (error) {
    console.error('Error fetching agent referrals:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAgentCommissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId; // Get the authenticated user ID

    const commissions = await prisma.commission.findMany({
      where: { userId: userId },
      include: {
        order: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(commissions);
  } catch (error) {
    console.error('Error fetching agent commissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAgentPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId; // Get the authenticated user ID

    const payouts = await prisma.payout.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payouts);
  } catch (error) {
    console.error('Error fetching agent payouts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAgentProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId; // Get the authenticated user ID

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        bankDetails: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching agent profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAgentProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId; // Get the authenticated user ID
    const { firstName, lastName, email, mobileNumber, bankDetails } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email, // Note: In a real app, you'd want to verify email changes
        mobileNumber,
        bankDetails
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        bankDetails: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating agent profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get referral click statistics for an agent
export const getAgentReferralClicks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId; // Get the authenticated user ID

    // Use raw SQL query to get referral click statistics
    const result = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalClicks,
        json_agg(
          json_build_object(
            'date', DATE("createdAt"),
            'count', count
          )
        ) FILTER (WHERE DATE("createdAt") IS NOT NULL) as clicksByDate
      FROM (
        SELECT 
          "createdAt",
          COUNT(*) as count
        FROM "ReferralClick"
        WHERE "agentId" = ${userId}
          AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt") DESC
        LIMIT 7
      ) sub
    ` as any[];

    const data = result[0] as any;
    
    res.json({
      totalClicks: parseInt(data.totalClicks) || 0,
      clicksByDate: data.clicksByDate || []
    });
  } catch (error) {
    console.error('Error fetching agent referral clicks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Update order status
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid order status. Valid statuses are: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED' });
      return;
    }

    // Get the current order to check if status change is valid
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        product: true,
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            address: true
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

    // If the order status is changed to CONFIRMED, SHIPPED, or DELIVERED, it contributes to revenue
    // The dashboard will automatically reflect this when recalculating metrics
    
    // Format the response similar to other order responses
    const formattedOrder = {
      id: updatedOrder.id,
      orderNumber: `ORD-${updatedOrder.id.slice(-4).toUpperCase()}`,
      status: updatedOrder.status,
      totalPrice: Number(updatedOrder.totalPrice),
      subtotal: updatedOrder.subtotal ? Number(updatedOrder.subtotal) : undefined,
      tax: updatedOrder.tax ? Number(updatedOrder.tax) : undefined,
      shipping: updatedOrder.shipping ? Number(updatedOrder.shipping) : undefined,
      paymentMethod: updatedOrder.paymentMethod || undefined,
      paymentDetails: updatedOrder.paymentDetails ? (typeof updatedOrder.paymentDetails === 'string' ? JSON.parse(updatedOrder.paymentDetails) : updatedOrder.paymentDetails) : undefined,
      shippingAddress: updatedOrder.shippingAddress || undefined,
      billingAddress: updatedOrder.billingAddress || undefined,
      createdAt: updatedOrder.createdAt.toISOString(),
      items: [{
        id: updatedOrder.product.id,
        name: updatedOrder.product.name,
        price: Number(updatedOrder.product.price),
        quantity: updatedOrder.quantity,
        image: updatedOrder.product.image || undefined
      }],
      customer: {
        id: updatedOrder.customer.id,
        email: updatedOrder.customer.email,
        firstName: updatedOrder.customer.firstName || '',
        lastName: updatedOrder.customer.lastName || '',
        phone: updatedOrder.customer.phone || '',
        shippingAddress: updatedOrder.customer.address || ''
      },
      agent: updatedOrder.agent ? {
        id: updatedOrder.agent.id,
        email: updatedOrder.agent.email,
        firstName: updatedOrder.agent.firstName || '',
        lastName: updatedOrder.agent.lastName || ''
      } : undefined
    };

    res.json(formattedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};