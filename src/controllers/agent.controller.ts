import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Get agent by ID
export const getAgentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const agent = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });
    
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }
    
    res.status(200).json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};