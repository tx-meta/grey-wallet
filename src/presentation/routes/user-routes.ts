/**
 * User Routes
 * Defines user-related API endpoints
 */

import { Router } from 'express';

const router = Router();

// TODO: Implement user routes
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'User routes - implementation pending',
  });
});

export default router; 