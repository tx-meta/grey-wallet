/**
 * Sell Crypto Routes
 * API routes for crypto selling operations
 */

import { Router } from 'express';
import { container } from '../../infrastructure/container';

const router = Router();

// Get controller and middleware from container
const sellCryptoController = container.getSellCryptoController();
const authMiddleware = container.getAuthMiddleware();

// Apply authentication to all sell crypto routes
router.use(authMiddleware.authenticate);

/**
 * @route POST /api/sell/crypto/quantity-to-fiat
 * @desc Get sell quote for specified crypto quantity
 * @access Private
 */
router.post('/quantity-to-fiat', sellCryptoController.getSellQuantityToFiatQuote.bind(sellCryptoController));

/**
 * @route POST /api/sell/crypto/fiat-to-quantity
 * @desc Get sell quote for specified fiat amount
 * @access Private
 */
router.post('/fiat-to-quantity', sellCryptoController.getSellFiatToQuantityQuote.bind(sellCryptoController));

/**
 * @route POST /api/sell/crypto/finalize
 * @desc Finalize crypto sale using stored quote
 * @access Private
 */
router.post('/finalize', sellCryptoController.finalizeCryptoSale.bind(sellCryptoController));

export default router;
