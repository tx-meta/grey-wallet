/**
 * Payment Controller
 * Handles crypto purchase and payment callback requests
 */

import { Request, Response } from 'express';
import { InitiateCryptoPurchaseUseCase } from '../../domain/use_cases/initiate-crypto-purchase';
import { ProcessPaymentCallbackUseCase } from '../../domain/use_cases/process-payment-callback';
import { GetTransactionStatusUseCase } from '../../domain/use_cases/get-transaction-status';
import { processCallbackData, detectCallbackType } from '../../shared/utils/callback-formatter';
import logger from '../../shared/logging';

export class PaymentController {
  constructor(
    private initiateCryptoPurchaseUseCase: InitiateCryptoPurchaseUseCase,
    private processPaymentCallbackUseCase: ProcessPaymentCallbackUseCase,
    private getTransactionStatusUseCase: GetTransactionStatusUseCase
  ) {}

  /**
   * POST /api/payments/crypto/purchase
   * DEPRECATED: Use the new buy crypto quote endpoints instead
   * Redirects to new buy crypto pattern
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

      const { tokenSymbol, fiatAmount, phoneNumber, userCurrency = 'KES' } = req.body;

      if (!tokenSymbol || !fiatAmount || !phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Token symbol, fiat amount, and phone number are required',
        });
        return;
      }

      logger.warn('Deprecated crypto purchase endpoint used', { 
        userId, 
        tokenSymbol, 
        fiatAmount, 
        phoneNumber,
        message: 'This endpoint is deprecated. Please use the new buy crypto quote endpoints.'
      });

      // Redirect to new buy crypto pattern
      res.status(301).json({
        success: false,
        message: 'This endpoint is deprecated. Please use the new buy crypto quote endpoints.',
        migration: {
          oldEndpoint: '/api/payments/crypto/purchase',
          newEndpoints: {
            getQuote: '/api/buy/crypto/fiat-to-quantity-quote',
            finalize: '/api/buy/crypto/finalize'
          },
          steps: [
            '1. First, get a quote using POST /api/buy/crypto/fiat-to-quantity-quote',
            '2. Then, finalize the purchase using POST /api/buy/crypto/finalize with the quoteId'
          ],
          example: {
            step1: {
              method: 'POST',
              url: '/api/buy/crypto/fiat-to-quantity-quote',
              body: {
                tokenSymbol,
                fiatAmount,
                userCurrency
              }
            },
            step2: {
              method: 'POST',
              url: '/api/buy/crypto/finalize',
              body: {
                quoteId: 'from_step_1_response',
                phoneNumber
              }
            }
          }
        }
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

      // Debug logging to see the actual callback data structure
      logger.info('M-Pesa callback received - Full data', { 
        callbackData,
        headers: req.headers,
        bodyKeys: Object.keys(callbackData || {}),
        callbackType: detectCallbackType(callbackData)
      });

      // Use the callback formatter utility to process the data
      let processedData;
      try {
        processedData = processCallbackData(callbackData);
        
        logger.info('M-Pesa callback processed successfully', { 
          callbackType: detectCallbackType(callbackData),
          processedData
        });
      } catch (error) {
        logger.error('M-Pesa callback processing failed', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          callbackData,
          callbackType: detectCallbackType(callbackData)
        });
        
        // Return success to M-Pesa to avoid retries, but log the issue
        res.status(200).json({
          ResultCode: '0',
          ResultDesc: 'Callback received but processing failed'
        });
        return;
      }

      const callbackRequest = {
        checkoutRequestId: processedData.checkoutRequestId,
        merchantRequestId: processedData.merchantRequestId,
        resultCode: processedData.resultCode,
        resultDesc: processedData.resultDesc,
        amount: processedData.amount,
        ...(processedData.mpesaReceiptNumber && { mpesaReceiptNumber: processedData.mpesaReceiptNumber }),
        ...(processedData.transactionDate && { transactionDate: processedData.transactionDate }),
        ...(processedData.phoneNumber && { phoneNumber: processedData.phoneNumber })
      };

      const result = await this.processPaymentCallbackUseCase.execute(callbackRequest);

      if (!result.success) {
        logger.error('Payment callback processing failed', { 
          error: result.error,
          checkoutRequestId: processedData.checkoutRequestId,
          merchantRequestId: processedData.merchantRequestId,
          resultCode: processedData.resultCode
        });
        
        // Return success to M-Pesa to avoid retries, but log the issue
        res.status(200).json({
          ResultCode: '0',
          ResultDesc: 'Callback processed but internal error occurred'
        });
        return;
      }

      logger.info('Payment callback processed successfully', { 
        checkoutRequestId: processedData.checkoutRequestId,
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
   * GET /api/payments/mpesa/callback/health
   * Health check for M-Pesa callback endpoint
   */
  async mpesaCallbackHealth(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'M-Pesa callback endpoint is healthy',
        timestamp: new Date().toISOString(),
        service: 'grey-wallet-api'
      });
    } catch (error) {
      logger.error('M-Pesa callback health check error', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        message: 'M-Pesa callback endpoint health check failed'
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

      logger.info('Get purchase status request received', { 
        userId, 
        purchaseId 
      });

      const result = await this.getTransactionStatusUseCase.execute({
        transactionId: purchaseId,
        userId
      });

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Purchase status retrieved successfully', { 
        userId, 
        purchaseId,
        status: result.data?.status 
      });

      res.status(200).json({
        success: true,
        data: result.data,
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