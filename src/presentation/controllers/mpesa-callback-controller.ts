/**
 * M-Pesa Callback Controller
 * Handles M-Pesa payment callbacks for transaction completion
 */

import { Request, Response } from 'express';
import { MpesaPaymentService } from '../../infrastructure/services/mpesa/mpesa-payment-service';
import { WalletRepository } from '../../domain/repositories/wallet-repository';
import { NotificationService } from '../../application/interfaces/notification-service';
import { PaymentService } from '../../application/interfaces/payment-service';
import { TreasuryService } from '../../application/interfaces/treasury-service';
import { ProcessPaymentCallbackWithTreasuryUseCase } from '../../domain/use_cases/process-payment-callback-with-treasury';
import logger from '../../shared/logging';

export class MpesaCallbackController {
  private mpesaService: MpesaPaymentService;
  private processPaymentCallbackUseCase: ProcessPaymentCallbackWithTreasuryUseCase;

  constructor(
    walletRepository: WalletRepository,
    notificationService: NotificationService,
    paymentService: PaymentService,
    treasuryService: TreasuryService
  ) {
    this.mpesaService = new MpesaPaymentService();
    this.processPaymentCallbackUseCase = new ProcessPaymentCallbackWithTreasuryUseCase(
      walletRepository,
      paymentService,
      notificationService,
      treasuryService
    );
  }

  /**
   * POST /api/mpesa/callback/stk-push
   * Handle STK Push callback (for buy crypto) - Simplified with unified use case
   */
  async handleSTKPushCallback(req: Request, res: Response): Promise<void> {
    try {
      const callbackData = req.body;
      
      logger.info('STK Push callback received', {
        body: callbackData
      });

      const result = this.mpesaService.processCallback(callbackData);

      if (result.success) {
        // Use the unified payment callback use case
        const callbackResult = await this.processPaymentCallbackUseCase.execute({
          checkoutRequestId: result.transactionId!,
          merchantRequestId: '', // STK Push doesn't have merchant request ID
          resultCode: '0', // Success
          resultDesc: 'Transaction completed successfully',
          amount: result.amount || 0,
          mpesaReceiptNumber: result.mpesaReceiptNumber || '',
          transactionDate: result.transactionDate || '',
          phoneNumber: result.phoneNumber || ''
        });

        if (callbackResult.success) {
          logger.info('STK Push transaction completed successfully', {
            transactionId: callbackResult.data?.transactionId,
            mpesaReceiptNumber: result.mpesaReceiptNumber,
            amount: result.amount
          });
        } else {
          logger.error('STK Push transaction processing failed', {
            error: callbackResult.error,
            transactionId: result.transactionId
          });
        }
      } else {
        // Payment failed - use the unified use case for failure handling
        const callbackResult = await this.processPaymentCallbackUseCase.execute({
          checkoutRequestId: result.transactionId!,
          merchantRequestId: '', // STK Push doesn't have merchant request ID
          resultCode: '1', // Failure
          resultDesc: result.error || 'Payment failed',
          amount: 0,
          phoneNumber: result.phoneNumber || ''
        });

        logger.warn('STK Push transaction failed', {
          transactionId: result.transactionId,
          error: result.error,
          callbackResult: callbackResult.success
        });
      }

      // Respond to M-Pesa
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Callback processed successfully'
      });
    } catch (error) {
      logger.error('STK Push callback processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      res.status(500).json({
        ResultCode: 1,
        ResultDesc: 'Callback processing failed'
      });
    }
  }

  /**
   * POST /api/mpesa/callback/b2c
   * Handle B2C callback (legacy - sell crypto is now start-to-finish)
   * This endpoint is kept for backward compatibility but is no longer used
   */
  async handleB2CCallback(req: Request, res: Response): Promise<void> {
    try {
      const callbackData = req.body;
      
      logger.warn('B2C callback received but not needed - sell crypto is now start-to-finish', {
        body: callbackData
      });

      // For the new start-to-finish sell crypto flow, B2C callbacks are not needed
      // because the transaction is completed immediately when the user finalizes the sale
      
      // Just log the callback for monitoring purposes but don't process it
      logger.info('B2C callback ignored - sell crypto transactions are now start-to-finish', {
        callbackData: callbackData
      });

      // Respond to M-Pesa to acknowledge receipt
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Callback received - sell crypto is now start-to-finish'
      });
    } catch (error) {
      logger.error('B2C callback processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      res.status(500).json({
        ResultCode: 1,
        ResultDesc: 'Callback processing failed'
      });
    }
  }
}
