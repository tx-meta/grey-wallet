/**
 * Wallet Routes
 * Defines wallet-related API endpoints
 */

import { Router } from 'express';
import { container } from '../../infrastructure/container';

// Get wallet controller from dependency injection container
const walletController = container.getWalletController();
const authMiddleware = container.getAuthMiddleware();

const router = Router();

// GET /api/wallet/tokens - Get supported tokens (public endpoint, no auth required)
router.get('/tokens', walletController.getSupportedTokens.bind(walletController));

// Apply authentication middleware to protected wallet routes
router.use(authMiddleware.authenticate);

// GET /api/wallet - Get comprehensive wallet information
router.get('/', walletController.getWalletInfo.bind(walletController));

// GET /api/wallet/overview - Get wallet overview
router.get('/overview', walletController.getWalletOverview.bind(walletController));

// GET /api/wallet/addresses - Get all wallet addresses
router.get('/addresses', walletController.getWalletAddresses.bind(walletController));

// GET /api/wallet/addresses/:tokenSymbol - Get wallet address for specific token
router.get('/addresses/:tokenSymbol', walletController.getTokenAddress.bind(walletController));

// GET /api/wallet/balance/:tokenSymbol - Get balance for specific token
router.get('/balance/:tokenSymbol', walletController.getTokenBalance.bind(walletController));

export default router; 