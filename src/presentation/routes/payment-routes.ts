/**
 * Payment Routes
 * Defines payment-related API endpoints
 */

import { Router } from 'express';
import { container } from '../../infrastructure/container';

// Get payment controller and auth middleware from dependency injection container
const paymentController = container.getPaymentController();
const authMiddleware = container.getAuthMiddleware();

const router = Router();

// POST /api/payments/crypto/purchase - Initiate crypto purchase (requires auth)
router.post('/crypto/purchase', authMiddleware.authenticate, paymentController.initiateCryptoPurchase.bind(paymentController));

// GET /api/payments/mpesa/callback/health - Health check for M-Pesa callback (no auth required)
router.get('/mpesa/callback/health', paymentController.mpesaCallbackHealth.bind(paymentController));

// POST /api/payments/mpesa/callback - M-Pesa callback (no auth required)
router.post('/mpesa/callback', paymentController.handleMpesaCallback.bind(paymentController));

// GET /api/payments/purchase/:purchaseId - Get purchase status (requires auth)
router.get('/purchase/:purchaseId', authMiddleware.authenticate, paymentController.getPurchaseStatus.bind(paymentController));

export default router; 