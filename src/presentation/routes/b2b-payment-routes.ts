/**
 * B2B Payment Routes
 * Defines B2B MPESA payment API endpoints
 */

import { Router } from 'express';
import { container } from '../../infrastructure/container';

// Get B2B payment controller and auth middleware from dependency injection container
const b2bPaymentController = container.getB2BPaymentController();
const authMiddleware = container.getAuthMiddleware();

const router = Router();

// Apply authentication middleware to all B2B payment routes
router.use(authMiddleware.authenticate);

// POST /api/payments/b2b/quote - Create B2B payment quote (requires auth)
router.post('/quote', b2bPaymentController.createB2BPaymentQuote.bind(b2bPaymentController));

// POST /api/payments/b2b/finalize - Finalize B2B payment using stored quote (requires auth)
router.post('/finalize', b2bPaymentController.finalizeB2BPayment.bind(b2bPaymentController));

export default router;
