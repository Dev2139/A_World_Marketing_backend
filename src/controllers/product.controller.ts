import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Get all active products (public route)
export const getPublicProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true // Only return active products
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        category: true,
        stockQuantity: true,
        commissionPercentage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        productImages: {
          select: {
            imageUrl: true,
            isPrimary: true,
            sortOrder: true
          },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert Decimal fields to numbers for JSON serialization
    const formattedProducts = products.map((product: any) => ({
      ...product,
      price: Number(product.price),
      stockQuantity: Number(product.stockQuantity),
      commissionPercentage: Number(product.commissionPercentage),
      allImages: product.productImages ? product.productImages.map((img: any) => img.imageUrl) : []
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching public products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get a specific product by ID (public route)
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        category: true,
        stockQuantity: true,
        commissionPercentage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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
    
    // Only return the product if it's active
    if (!product.isActive) {
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