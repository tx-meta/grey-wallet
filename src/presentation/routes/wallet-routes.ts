/**
 * Wallet Routes
 * Defines wallet-related API endpoints
 */

import { Router } from 'express';

const router = Router();

// TODO: Implement wallet routes
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Wallet routes - implementation pending',
  });
});

export default router; 