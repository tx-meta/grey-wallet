/**
 * Crypto Quote Routes
 * Defines crypto quotation API endpoints
 */

import { Router } from 'express';
import { container } from '../../infrastructure/container';

// Get crypto quote controller from dependency injection container
const cryptoQuoteController = container.getCryptoQuoteController();

const router = Router();

// POST /api/quotes/crypto/quantity-to-fiat - Get fiat cost for crypto quantity (no auth required for quotes)
router.post('/quantity-to-fiat', cryptoQuoteController.getQuantityToFiatQuote.bind(cryptoQuoteController));

// POST /api/quotes/crypto/fiat-to-quantity - Get crypto quantity for fiat amount (no auth required for quotes)
router.post('/fiat-to-quantity', cryptoQuoteController.getFiatToQuantityQuote.bind(cryptoQuoteController));

// GET /api/quotes/crypto/health - Health check for crypto quote service (no auth required)
router.get('/health', cryptoQuoteController.healthCheck.bind(cryptoQuoteController));

export default router;
