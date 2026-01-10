import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Record a referral click
export const recordReferralClick = async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '';
    const userAgent = req.get('User-Agent') || '';

    // Validate agent exists
    const agent = await prisma.user.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    // Record the referral click using raw SQL
    await prisma.$executeRaw`
      INSERT INTO "ReferralClick" ("agentId", "ip", "userAgent")
      VALUES (${agentId}, ${ip}, ${userAgent})
    `;

    res.status(201).json({ message: 'Referral click recorded' });
  } catch (error) {
    console.error('Error recording referral click:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get referral click statistics for an agent
export const getReferralClicksByAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;

    // Validate agent exists
    const agent = await prisma.user.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    // Get referral click statistics using raw SQL
    const totalClicksResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "ReferralClick" WHERE "agentId" = ${agentId}
    ` as any[];
    
    const totalClicks = parseInt(totalClicksResult[0]?.count) || 0;

    // Get clicks by date (last 30 days)
    const clicksByDate = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "ReferralClick"
      WHERE "agentId" = ${agentId}
        AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") DESC
    ` as any[];

    res.json({
      totalClicks,
      clicksByDate
    });
  } catch (error) {
    console.error('Error fetching referral click statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};