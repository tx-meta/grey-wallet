/**
 * M-Pesa Callback Controller
 * Handles M-Pesa payment callbacks for transaction completion
 */

import { Request, Response } from 'express';
import { MpesaPaymentService } from '../../infrastructure/services/mpesa/mpesa-payment-service';
import { WalletRepository } from '../../domain/repositories/wallet-repository';
import { NotificationService } from '../../application/interfaces/notification-service';
import logger from '../../shared/logging';

export class MpesaCallbackController {
  private mpesaService: MpesaPaymentService;

  constructor(
    private walletRepository: WalletRepository,
    private notificationService: NotificationService
  ) {
    this.mpesaService = new MpesaPaymentService();
  }

  /**
   * POST /api/mpesa/callback/stk-push
   * Handle STK Push callback (for buy crypto)
   */
  async handleSTKPushCallback(req: Request, res: Response): Promise<void> {
    try {
      const callbackData = req.body;
      
      logger.info('STK Push callback received', {
        body: callbackData
      });

      const result = this.mpesaService.processCallback(callbackData);

      if (result.success) {
        // Find transaction by checkout request ID
        const transaction = await this.walletRepository.findTransactionByCheckoutRequestId(result.transactionId!);
        
        if (transaction) {
          // Update transaction status to completed
          await this.walletRepository.updateTransactionStatus(transaction.id, 'completed');
          
          // Update transaction with M-Pesa details
          await this.walletRepository.updateTransactionPaymentDetails(transaction.id, {
            status: 'completed',
            mpesaReceiptNumber: result.mpesaReceiptNumber || undefined,
            transactionDate: result.transactionDate || undefined,
            amount: result.amount || undefined
          });

          // Add crypto to user's wallet
          if (transaction.transactionType === 'ON_RAMP') {
            await this.walletRepository.updateUserTokenBalance(
              transaction.userId,
              transaction.tokenSymbol,
              transaction.cryptoAmount
            );
          }

          // Send success notification
          await this.notificationService.sendNotification({
            userId: transaction.userId,
            type: 'transaction_completed',
            title: 'Transaction Completed',
            message: `Your ${transaction.tokenSymbol} ${transaction.transactionType === 'ON_RAMP' ? 'purchase' : 'sale'} has been completed successfully.`,
            data: {
              transactionId: transaction.id,
              tokenSymbol: transaction.tokenSymbol,
              amount: transaction.fiatAmount,
              mpesaReceiptNumber: result.mpesaReceiptNumber
            }
          });

          logger.info('STK Push transaction completed successfully', {
            transactionId: transaction.id,
            mpesaReceiptNumber: result.mpesaReceiptNumber,
            amount: result.amount
          });
        } else {
          logger.warn('Transaction not found for STK Push callback', {
            checkoutRequestId: result.transactionId
          });
        }
      } else {
        // Payment failed - find and update transaction
        const transaction = await this.walletRepository.findTransactionByCheckoutRequestId(result.transactionId!);
        
        if (transaction) {
          await this.walletRepository.updateTransactionStatus(transaction.id, 'failed');
          
          // Send failure notification
          await this.notificationService.sendNotification({
            userId: transaction.userId,
            type: 'transaction_failed',
            title: 'Transaction Failed',
            message: `Your ${transaction.tokenSymbol} ${transaction.transactionType === 'ON_RAMP' ? 'purchase' : 'sale'} failed. ${result.error}`,
            data: {
              transactionId: transaction.id,
              tokenSymbol: transaction.tokenSymbol,
              error: result.error
            }
          });

          logger.warn('STK Push transaction failed', {
            transactionId: transaction.id,
            error: result.error
          });
        }
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
   * Handle B2C callback (for sell crypto)
   */
  async handleB2CCallback(req: Request, res: Response): Promise<void> {
    try {
      const callbackData = req.body;
      
      logger.info('B2C callback received', {
        body: callbackData
      });

      // B2C callbacks have a different structure
      const result = callbackData.Result;
      
      if (result.ResultCode === 0) {
        // Payment successful
        const transaction = await this.walletRepository.findTransactionByOriginatorConversationId(result.OriginatorConversationID);
        
        if (transaction) {
          await this.walletRepository.updateTransactionStatus(transaction.id, 'completed');
          
          await this.walletRepository.updateTransactionPaymentDetails(transaction.id, {
            status: 'completed',
            mpesaReceiptNumber: result.MpesaReceiptNumber,
            transactionDate: result.TransactionDate,
            amount: result.TransactionAmount
          });

          // Send success notification
          await this.notificationService.sendNotification({
            userId: transaction.userId,
            type: 'transaction_completed',
            title: 'Transaction Completed',
            message: `Your ${transaction.tokenSymbol} sale has been completed successfully. M-Pesa payment processed.`,
            data: {
              transactionId: transaction.id,
              tokenSymbol: transaction.tokenSymbol,
              amount: transaction.fiatAmount,
              mpesaReceiptNumber: result.MpesaReceiptNumber
            }
          });

          logger.info('B2C transaction completed successfully', {
            transactionId: transaction.id,
            mpesaReceiptNumber: result.MpesaReceiptNumber,
            amount: result.TransactionAmount
          });
        } else {
          logger.warn('Transaction not found for B2C callback', {
            originatorConversationId: result.OriginatorConversationID
          });
        }
      } else {
        // Payment failed
        const transaction = await this.walletRepository.findTransactionByOriginatorConversationId(result.OriginatorConversationID);
        
        if (transaction) {
          await this.walletRepository.updateTransactionStatus(transaction.id, 'failed');
          
          // Rollback crypto balance if it was a sale
          if (transaction.transactionType === 'OFF_RAMP') {
            const currentBalance = await this.walletRepository.getUserTokenBalance(transaction.userId, transaction.tokenSymbol);
            await this.walletRepository.updateUserTokenBalance(
              transaction.userId,
              transaction.tokenSymbol,
              currentBalance + transaction.cryptoAmount
            );
          }

          // Send failure notification
          await this.notificationService.sendNotification({
            userId: transaction.userId,
            type: 'transaction_failed',
            title: 'Transaction Failed',
            message: `Your ${transaction.tokenSymbol} sale failed. ${result.ResultDesc}`,
            data: {
              transactionId: transaction.id,
              tokenSymbol: transaction.tokenSymbol,
              error: result.ResultDesc
            }
          });

          logger.warn('B2C transaction failed', {
            transactionId: transaction.id,
            error: result.ResultDesc
          });
        }
      }

      // Respond to M-Pesa
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Callback processed successfully'
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
