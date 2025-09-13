/**
 * B2B Payment Controller
 * Handles B2B MPESA payment requests using crypto funds
 */

import { Request, Response } from 'express';
import { CreateB2BPaymentQuoteUseCase } from '../../domain/use_cases/create-b2b-payment-quote';
import { FinalizeB2BPaymentUseCase } from '../../domain/use_cases/finalize-b2b-payment';
import logger from '../../shared/logging';

export class B2BPaymentController {
  constructor(
    private createB2BPaymentQuoteUseCase: CreateB2BPaymentQuoteUseCase,
    private finalizeB2BPaymentUseCase: FinalizeB2BPaymentUseCase
  ) {}

  /**
   * POST /api/payments/b2b/quote
   * Create a B2B payment quote for paying with crypto to MPESA recipients
   */
  async createB2BPaymentQuote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const {
        tokenSymbol,
        fiatAmount,
        recipientType,
        businessNumber,
        accountNumber,
        recipientName
      } = req.body;

      // Validate required fields
      if (!tokenSymbol || !fiatAmount || !recipientType || !businessNumber) {
        res.status(400).json({
          success: false,
          message: 'Token symbol, fiat amount, recipient type, and business number are required',
        });
        return;
      }

      // Validate recipient type
      if (!['paybill', 'till', 'pochi'].includes(recipientType.toLowerCase())) {
        res.status(400).json({
          success: false,
          message: 'Recipient type must be paybill, till, or pochi',
        });
        return;
      }

      // Validate account number for paybill
      if (recipientType.toLowerCase() === 'paybill' && !accountNumber) {
        res.status(400).json({
          success: false,
          message: 'Account number is required for paybill payments',
        });
        return;
      }

      logger.info('B2B payment quote request received', {
        userId,
        tokenSymbol,
        fiatAmount,
        recipientType,
        businessNumber
      });

      const result = await this.createB2BPaymentQuoteUseCase.execute({
        userId,
        tokenSymbol: tokenSymbol.toUpperCase(),
        fiatAmount: parseFloat(fiatAmount),
        recipientType: recipientType.toLowerCase(),
        businessNumber: businessNumber.toString(),
        accountNumber: accountNumber?.toString(),
        recipientName: recipientName?.toString()
      });

      if (!result.success) {
        logger.error('B2B payment quote creation failed', {
          userId,
          error: result.error,
          tokenSymbol,
          fiatAmount
        });

        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('B2B payment quote created successfully', {
        userId,
        quoteId: result.data?.quoteId,
        tokenAmount: result.data?.tokenAmount,
        fiatAmount: result.data?.fiatAmount
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('B2B payment quote error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/payments/b2b/finalize
   * Finalize a B2B payment using a stored quote
   */
  async finalizeB2BPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { quoteId } = req.body;

      if (!quoteId) {
        res.status(400).json({
          success: false,
          message: 'Quote ID is required',
        });
        return;
      }

      logger.info('B2B payment finalize request received', {
        userId,
        quoteId
      });

      const result = await this.finalizeB2BPaymentUseCase.execute({
        userId,
        quoteId: quoteId.toString()
      });

      if (!result.success) {
        logger.error('B2B payment finalization failed', {
          userId,
          quoteId,
          error: result.error
        });

        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('B2B payment finalized successfully', {
        userId,
        quoteId,
        transactionId: result.data?.transactionId,
        mpesaConversationId: result.data?.mpesaResponse?.conversationId
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('B2B payment finalize error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        quoteId: req.body?.quoteId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}
