/**
 * M-Pesa Callback Routes
 * Defines M-Pesa callback endpoints for transaction completion
 */

import { Router } from 'express';
import { container } from '../../infrastructure/container';
import { MpesaCallbackController } from '../controllers/mpesa-callback-controller';

// Get M-Pesa callback controller from dependency injection container
const mpesaCallbackController = new MpesaCallbackController(
  container.getRepositories().walletRepository,
  container.getServices().notificationService,
  container.getServices().paymentService,
  container.getServices().treasuryService
);

const router = Router();

// POST /api/mpesa/callback/stk-push - Handle STK Push callbacks (buy crypto)
router.post('/stk-push', mpesaCallbackController.handleSTKPushCallback.bind(mpesaCallbackController));

// POST /api/mpesa/callback/b2c - Handle B2C callbacks (sell crypto)
router.post('/b2c', mpesaCallbackController.handleB2CCallback.bind(mpesaCallbackController));

export default router;
