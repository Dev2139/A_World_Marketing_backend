import express from 'express';
import { login, logout, refreshToken, getCurrentUser } from '../controllers/auth.controller';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../middlewares/auth.middleware';

const router = express.Router();

// Rate limiting for login endpoint (max 5 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/me', requireAuth, getCurrentUser);

export default router;