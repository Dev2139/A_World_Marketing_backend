import express from 'express';
import { recordReferralClick, getReferralClicksByAgent } from '../controllers/referral.controller';

const router = express.Router();

// Record a referral click when someone visits through a referral link
router.post('/click/:agentId', recordReferralClick);

// Get referral click statistics for an agent (requires agent authentication)
router.get('/stats/:agentId', getReferralClicksByAgent);

export default router;