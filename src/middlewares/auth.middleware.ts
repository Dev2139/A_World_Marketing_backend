import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromCookies } from '../utils/jwt';
import prisma from '../lib/prisma';

/**
 * Middleware to require authentication
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from cookies
    const token = extractTokenFromCookies(req, 'access');
    
    if (!token) {
      res.status(401).json({ message: 'Access token not provided' });
      return;
    }

    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(403).json({ message: 'Invalid or expired access token' });
      return;
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      res.status(403).json({ message: 'User not found or inactive' });
      return;
    }

    // Attach user to request object
    (req as any).user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // First, ensure user is authenticated
    await requireAuth(req, res, async () => {
      const user = (req as any).user;
      
      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({ message: 'Access denied. Admin role required.' });
        return;
      }
      
      next();
    });
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to require agent role
 */
export const requireAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // First, ensure user is authenticated
    await requireAuth(req, res, async () => {
      const user = (req as any).user;
      
      if (!user || user.role !== 'AGENT') {
        res.status(403).json({ message: 'Access denied. Agent role required.' });
        return;
      }
      
      next();
    });
  } catch (error) {
    console.error('Agent middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to require admin or agent role
 */
export const requireAdminOrAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // First, ensure user is authenticated
    await requireAuth(req, res, async () => {
      const user = (req as any).user;
      
      if (!user || (user.role !== 'ADMIN' && user.role !== 'AGENT')) {
        res.status(403).json({ message: 'Access denied. Admin or Agent role required.' });
        return;
      }
      
      next();
    });
  } catch (error) {
    console.error('Admin or Agent middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
