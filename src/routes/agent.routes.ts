import express from 'express';
import { 
  getAgentDashboardMetrics,
  getAgentReferrals,
  getAgentCommissions,
  getAgentPayouts,
  getAgentProfile,
  updateAgentProfile,
  createPayout
} from '../controllers/admin.controller'; // Using the same controller for now
import { getAgentById } from '../controllers/agent.controller';
import { requireAgent } from '../middlewares/auth.middleware';

const router = express.Router();

// Agent dashboard routes
router.get('/dashboard', requireAgent, getAgentDashboardMetrics);
router.get('/referrals', requireAgent, getAgentReferrals);
router.get('/commissions', requireAgent, getAgentCommissions);
router.get('/payouts', requireAgent, getAgentPayouts);
router.post('/payouts', requireAgent, createPayout);
router.get('/profile', requireAgent, getAgentProfile);
router.put('/profile', requireAgent, updateAgentProfile);

// Public route for getting agent by ID
router.get('/:id', getAgentById);


export default router;