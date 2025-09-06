/**
 * Crypto Quote Controller
 * Handles HTTP requests for crypto price quotations
 */

import { Request, Response } from 'express';
import { GetCryptoQuoteUseCase } from '../../domain/use_cases/get-crypto-quote';
import logger from '../../shared/logging';

export class CryptoQuoteController {
  constructor(
    private getCryptoQuoteUseCase: GetCryptoQuoteUseCase
  ) {}

  /**
   * POST /api/quotes/crypto/quantity-to-fiat
   * Get fiat cost for a specific crypto quantity
   */
  async getQuantityToFiatQuote(req: Request, res: Response): Promise<void> {
    try {
      const { tokenSymbol, quantity, userCurrency } = req.body;

      // Validate required fields
      if (!tokenSymbol || !quantity || !userCurrency) {
        res.status(400).json({
          success: false,
          message: 'Token symbol, quantity, and user currency are required'
        });
        return;
      }

      // Validate types
      if (typeof tokenSymbol !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Token symbol must be a string'
        });
        return;
      }

      if (typeof quantity !== 'number' || quantity <= 0) {
        res.status(400).json({
          success: false,
          message: 'Quantity must be a positive number'
        });
        return;
      }

      if (typeof userCurrency !== 'string') {
        res.status(400).json({
          success: false,
          message: 'User currency must be a string'
        });
        return;
      }

      logger.info('Quantity-to-fiat quote request received', {
        tokenSymbol,
        quantity,
        userCurrency
      });

      const result = await this.getCryptoQuoteUseCase.getQuantityToFiatQuote({
        tokenSymbol,
        quantity,
        userCurrency
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error
        });
        return;
      }

      logger.info('Quantity-to-fiat quote generated successfully', {
        tokenSymbol,
        quantity,
        totalCost: result.data.totalInUserCurrency,
        currency: userCurrency
      });

      res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Quantity-to-fiat quote error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/quotes/crypto/fiat-to-quantity
   * Get crypto quantity for a specific fiat amount
   */
  async getFiatToQuantityQuote(req: Request, res: Response): Promise<void> {
    try {
      const { tokenSymbol, fiatAmount, userCurrency } = req.body;

      // Validate required fields
      if (!tokenSymbol || !fiatAmount || !userCurrency) {
        res.status(400).json({
          success: false,
          message: 'Token symbol, fiat amount, and user currency are required'
        });
        return;
      }

      // Validate types
      if (typeof tokenSymbol !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Token symbol must be a string'
        });
        return;
      }

      if (typeof fiatAmount !== 'number' || fiatAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Fiat amount must be a positive number'
        });
        return;
      }

      if (typeof userCurrency !== 'string') {
        res.status(400).json({
          success: false,
          message: 'User currency must be a string'
        });
        return;
      }

      logger.info('Fiat-to-quantity quote request received', {
        tokenSymbol,
        fiatAmount,
        userCurrency
      });

      const result = await this.getCryptoQuoteUseCase.getFiatToQuantityQuote({
        tokenSymbol,
        fiatAmount,
        userCurrency
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error
        });
        return;
      }

      logger.info('Fiat-to-quantity quote generated successfully', {
        tokenSymbol,
        fiatAmount,
        quantity: result.data.quantity,
        currency: userCurrency
      });

      res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Fiat-to-quantity quote error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/quotes/crypto/health
   * Health check for crypto quote service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // We could check the service health here if needed
      res.status(200).json({
        success: true,
        message: 'Crypto quote service is healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Crypto quote health check error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        message: 'Service health check failed'
      });
    }
  }
}
