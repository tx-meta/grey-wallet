/**
 * Payment Controller
 * Handles crypto purchase and payment callback requests
 */

import { Request, Response } from 'express';
import { InitiateCryptoPurchaseUseCase } from '../../domain/use_cases/initiate-crypto-purchase';
import { ProcessPaymentCallbackUseCase } from '../../domain/use_cases/process-payment-callback';
import logger from '../../shared/logging';

export class PaymentController {
  constructor(
    private initiateCryptoPurchaseUseCase: InitiateCryptoPurchaseUseCase,
    private processPaymentCallbackUseCase: ProcessPaymentCallbackUseCase
  ) {}

  /**
   * POST /api/payments/crypto/purchase
   * Initiate crypto purchase via M-Pesa
   */
  async initiateCryptoPurchase(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { tokenSymbol, fiatAmount, phoneNumber } = req.body;

      if (!tokenSymbol || !fiatAmount || !phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Token symbol, fiat amount, and phone number are required',
        });
        return;
      }

      logger.info('Crypto purchase request received', { 
        userId, 
        tokenSymbol, 
        fiatAmount, 
        phoneNumber 
      });

      const result = await this.initiateCryptoPurchaseUseCase.execute({
        userId,
        tokenSymbol,
        fiatAmount,
        phoneNumber
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Crypto purchase initiated successfully', { 
        userId, 
        transactionId: result.data?.transactionId 
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Crypto purchase error', { 
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
   * POST /api/payments/mpesa/callback
   * Handle M-Pesa payment callbacks
   */
  async handleMpesaCallback(req: Request, res: Response): Promise<void> {
    try {
      const callbackData = req.body;

      logger.info('M-Pesa callback received', { 
        checkoutRequestId: callbackData.CheckoutRequestID,
        resultCode: callbackData.ResultCode,
        resultDesc: callbackData.ResultDesc
      });

      const result = await this.processPaymentCallbackUseCase.execute({
        checkoutRequestId: callbackData.CheckoutRequestID,
        merchantRequestId: callbackData.MerchantRequestID,
        resultCode: callbackData.ResultCode,
        resultDesc: callbackData.ResultDesc,
        amount: callbackData.Amount,
        mpesaReceiptNumber: callbackData.MpesaReceiptNumber,
        transactionDate: callbackData.TransactionDate,
        phoneNumber: callbackData.PhoneNumber
      });

      if (!result.success) {
        logger.error('Payment callback processing failed', { 
          error: result.error,
          checkoutRequestId: callbackData.CheckoutRequestID
        });
        
        res.status(500).json({
          success: false,
          message: 'Failed to process callback',
        });
        return;
      }

      logger.info('Payment callback processed successfully', { 
        checkoutRequestId: callbackData.CheckoutRequestID,
        transactionId: result.data?.transactionId
      });

      // M-Pesa expects a specific response format
      res.status(200).json({
        ResultCode: result.data?.success ? '0' : '1',
        ResultDesc: result.data?.message || 'Callback processed'
      });
    } catch (error) {
      logger.error('M-Pesa callback error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });
      
      res.status(500).json({
        ResultCode: '1',
        ResultDesc: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/payments/purchase/:purchaseId
   * Get purchase status
   */
  async getPurchaseStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { purchaseId } = req.params;

      if (!purchaseId) {
        res.status(400).json({
          success: false,
          message: 'Purchase ID is required',
        });
        return;
      }

      // This would need to be implemented in the wallet repository
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        data: {
          transactionId: purchaseId,
          status: 'processing',
          message: 'Transaction status endpoint not yet implemented'
        }
      });
    } catch (error) {
      logger.error('Get purchase status error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
} 