/**
 * Sell Crypto Controller
 * Handles HTTP requests for crypto selling operations
 */

import { Request, Response } from 'express';
import { GetSellCryptoQuoteUseCase } from '../../domain/use_cases/get-sell-crypto-quote';
import { FinalizeCryptoSaleUseCase } from '../../domain/use_cases/finalize-crypto-sale';
import logger from '../../shared/logging';

export class SellCryptoController {
  constructor(
    private getSellCryptoQuoteUseCase: GetSellCryptoQuoteUseCase,
    private finalizeCryptoSaleUseCase: FinalizeCryptoSaleUseCase
  ) {}

  /**
   * POST /api/sell/crypto/quantity-to-fiat
   * Get sell quote for specified crypto quantity
   */
  async getSellQuantityToFiatQuote(req: Request, res: Response): Promise<void> {
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

      logger.info('Sell quantity-to-fiat quote request received', {
        userId,
        tokenSymbol,
        quantity,
        userCurrency
      });

      const result = await this.getSellCryptoQuoteUseCase.getSellQuantityToFiatQuote({
        userId,
        tokenSymbol,
        quantity: parseFloat(quantity),
        userCurrency
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Sell quantity-to-fiat quote generated successfully', {
        userId,
        quoteId: result.data!.quoteId,
        tokenSymbol,
        quantity,
        netAmountToUser: result.data!.netAmountToUser
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Get sell quantity-to-fiat quote error', {
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
   * POST /api/sell/crypto/fiat-to-quantity
   * Get sell quote for specified fiat amount
   */
  async getSellFiatToQuantityQuote(req: Request, res: Response): Promise<void> {
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

      logger.info('Sell fiat-to-quantity quote request received', {
        userId,
        tokenSymbol,
        fiatAmount,
        userCurrency
      });

      const result = await this.getSellCryptoQuoteUseCase.getSellFiatToQuantityQuote({
        userId,
        tokenSymbol,
        fiatAmount: parseFloat(fiatAmount),
        userCurrency
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Sell fiat-to-quantity quote generated successfully', {
        userId,
        quoteId: result.data!.quoteId,
        tokenSymbol,
        fiatAmount,
        requiredQuantity: result.data!.totalQuantityToSell
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Get sell fiat-to-quantity quote error', {
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
   * POST /api/sell/crypto/finalize
   * Finalize crypto sale using stored quote
   */
  async finalizeCryptoSale(req: Request, res: Response): Promise<void> {
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

      logger.info('Finalize crypto sale request received', {
        userId,
        quoteId,
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') // Mask phone number in logs
      });

      const result = await this.finalizeCryptoSaleUseCase.execute({
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

      logger.info('Crypto sale finalized successfully', {
        userId,
        transactionId: result.data!.transactionId,
        tokenSymbol: result.data!.tokenSymbol,
        quantitySold: result.data!.quantitySold,
        fiatAmount: result.data!.fiatAmount
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Finalize crypto sale error', {
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
