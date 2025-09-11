/**
 * Buy Crypto Routes
 * Defines buy crypto related API endpoints
 */

import { Router } from 'express';
import { container } from '../../infrastructure/container';

// Get buy crypto controller and auth middleware from dependency injection container
const buyCryptoController = container.getBuyCryptoController();
const authMiddleware = container.getAuthMiddleware();

const router = Router();

// POST /api/buy/crypto/quantity-to-fiat-quote - Get quote for buying crypto with specified quantity (requires auth)
router.post('/quantity-to-fiat-quote', authMiddleware.authenticate, buyCryptoController.getBuyQuantityToFiatQuote.bind(buyCryptoController));

// POST /api/buy/crypto/fiat-to-quantity-quote - Get quote for buying crypto with specified fiat amount (requires auth)
router.post('/fiat-to-quantity-quote', authMiddleware.authenticate, buyCryptoController.getBuyFiatToQuantityQuote.bind(buyCryptoController));

// POST /api/buy/crypto/finalize - Finalize crypto purchase using stored quote (requires auth)
router.post('/finalize', authMiddleware.authenticate, buyCryptoController.finalizeCryptoPurchase.bind(buyCryptoController));

export default router;
