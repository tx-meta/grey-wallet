/**
 * Buy Crypto Controller
 * Handles buy crypto related HTTP requests
 * Follows the same pattern as SellCryptoController
 */

import { Request, Response } from 'express';
import { GetBuyCryptoQuoteUseCase } from '../../domain/use_cases/get-buy-crypto-quote';
import { FinalizeCryptoPurchaseUseCase } from '../../domain/use_cases/finalize-crypto-purchase';
import logger from '../../shared/logging';

export class BuyCryptoController {
  constructor(
    private getBuyCryptoQuoteUseCase: GetBuyCryptoQuoteUseCase,
    private finalizeCryptoPurchaseUseCase: FinalizeCryptoPurchaseUseCase
  ) {}

  /**
   * POST /api/buy/crypto/quantity-to-fiat-quote
   * Get quote for buying crypto with specified quantity
   */
  async getBuyQuantityToFiatQuote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { tokenSymbol, quantity, userCurrency } = req.body;

      // Validate required fields
      if (!tokenSymbol || !quantity || !userCurrency) {
        res.status(400).json({
          success: false,
          message: 'Token symbol, quantity, and user currency are required',
        });
        return;
      }

      logger.info('Buy quantity-to-fiat quote request received', {
        userId,
        tokenSymbol,
        quantity,
        userCurrency
      });

      const result = await this.getBuyCryptoQuoteUseCase.getBuyQuantityToFiatQuote({
        userId,
        tokenSymbol,
        quantity,
        userCurrency
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Buy quantity-to-fiat quote generated successfully', {
        userId,
        tokenSymbol,
        quantity,
        totalCost: result.data.totalInUserCurrency,
        currency: userCurrency
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Buy quantity-to-fiat quote error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        body: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/buy/crypto/fiat-to-quantity-quote
   * Get quote for buying crypto with specified fiat amount
   */
  async getBuyFiatToQuantityQuote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { tokenSymbol, fiatAmount, userCurrency } = req.body;

      // Validate required fields
      if (!tokenSymbol || !fiatAmount || !userCurrency) {
        res.status(400).json({
          success: false,
          message: 'Token symbol, fiat amount, and user currency are required',
        });
        return;
      }

      logger.info('Buy fiat-to-quantity quote request received', {
        userId,
        tokenSymbol,
        fiatAmount,
        userCurrency
      });

      const result = await this.getBuyCryptoQuoteUseCase.getBuyFiatToQuantityQuote({
        userId,
        tokenSymbol,
        fiatAmount,
        userCurrency
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Buy fiat-to-quantity quote generated successfully', {
        userId,
        tokenSymbol,
        fiatAmount,
        quantity: result.data.quantity,
        currency: userCurrency
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Buy fiat-to-quantity quote error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        body: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/buy/crypto/finalize
   * Finalize crypto purchase using stored quote
   */
  async finalizeCryptoPurchase(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { quoteId, phoneNumber } = req.body;

      // Validate required fields
      if (!quoteId || !phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Quote ID and phone number are required',
        });
        return;
      }

      logger.info('Finalize crypto purchase request received', {
        userId,
        quoteId,
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') // Mask phone number in logs
      });

      const result = await this.finalizeCryptoPurchaseUseCase.execute({
        userId,
        quoteId,
        phoneNumber
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Crypto purchase finalized successfully', {
        userId,
        transactionId: result.data!.transactionId,
        tokenSymbol: result.data!.tokenSymbol,
        quantityPurchased: result.data!.quantityPurchased,
        fiatAmount: result.data!.fiatAmount
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Finalize crypto purchase error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        body: {
          ...req.body,
          phoneNumber: req.body.phoneNumber ? req.body.phoneNumber.replace(/\d(?=\d{4})/g, '*') : undefined
        }
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}
