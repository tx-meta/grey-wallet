/**
 * Process Payment Callback with Treasury Use Case
 * Handles M-Pesa payment callbacks and updates treasury balances
 * Unified approach for both buy and sell transactions
 */

import { WalletRepository } from '../repositories/wallet-repository';
import { PaymentService } from '../../application/interfaces/payment-service';
import { NotificationService } from '../../application/interfaces/notification-service';
import { TreasuryService } from '../../application/interfaces/treasury-service';
import logger from '../../shared/logging';

export interface PaymentCallbackRequest {
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: string;
  resultDesc: string;
  amount: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

export interface PaymentCallbackResponse {
  success: boolean;
  message: string;
  transactionId?: string;
}

export interface PaymentCallbackResult {
  success: boolean;
  data?: PaymentCallbackResponse;
  error?: string;
}

export class ProcessPaymentCallbackWithTreasuryUseCase {
  constructor(
    private walletRepository: WalletRepository,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private treasuryService: TreasuryService
  ) {}

  async execute(request: PaymentCallbackRequest): Promise<PaymentCallbackResult> {
    try {
      // 1. Validate callback data
      this.validateCallback(request);

      // 2. Check if payment was successful
      if (request.resultCode !== '0') {
        logger.warn('Payment failed', { 
          resultCode: request.resultCode,
          resultDesc: request.resultDesc,
          checkoutRequestId: request.checkoutRequestId
        });

        // Update transaction status to failed
        await this.updateTransactionStatus(request.checkoutRequestId, 'failed');

        return {
          success: true,
          data: {
            success: false,
            message: 'Payment failed',
          },
        };
      }

      // 3. Verify payment with M-Pesa API
      const verificationResult = await this.paymentService.verifyMpesaPayment(request.checkoutRequestId);
      
      if (!verificationResult.success || verificationResult.status !== 'completed') {
        logger.error('Payment verification failed', { 
          checkoutRequestId: request.checkoutRequestId,
          verificationResult
        });

        await this.updateTransactionStatus(request.checkoutRequestId, 'failed');

        return {
          success: true,
          data: {
            success: false,
            message: 'Payment verification failed',
          },
        };
      }

      // 4. Get transaction details
      const transaction = await this.walletRepository.findTransactionByCheckoutId(request.checkoutRequestId);
      if (!transaction) {
        logger.error('Transaction not found', { 
          checkoutRequestId: request.checkoutRequestId,
          merchantRequestId: request.merchantRequestId,
          resultCode: request.resultCode,
          resultDesc: request.resultDesc
        });
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      // 5. Update transaction with payment details
      const paymentDetails: any = { status: 'completed' };
      if (request.mpesaReceiptNumber) {
        paymentDetails.mpesaReceiptNumber = request.mpesaReceiptNumber;
      }
      if (request.transactionDate) {
        paymentDetails.transactionDate = request.transactionDate;
      }
      await this.walletRepository.updateTransactionPaymentDetails(transaction.id, paymentDetails);

      // 6. Update user's token balance and treasury balances
      if (transaction.transactionType === 'ON_RAMP') {
        // Buy crypto: User receives crypto, treasury gets fiat
        await this.walletRepository.updateUserTokenBalance(
          transaction.userId,
          transaction.tokenSymbol,
          transaction.cryptoAmount || 0
        );

        // Update treasury balances for buy transaction
        await this.updateTreasuryBalances(
          transaction.id,
          'ON_RAMP',
          transaction.tokenSymbol,
          transaction.cryptoAmount || 0,
          transaction.fiatAmount || 0,
          'KES' // Default to KES for now
        );
      } else if (transaction.transactionType === 'OFF_RAMP') {
        // Sell crypto: User loses crypto, treasury gets crypto
        await this.walletRepository.updateUserTokenBalance(
          transaction.userId,
          transaction.tokenSymbol,
          -(transaction.cryptoAmount || 0)
        );

        // Update treasury balances for sell transaction
        await this.updateTreasuryBalances(
          transaction.id,
          'OFF_RAMP',
          transaction.tokenSymbol,
          transaction.cryptoAmount || 0,
          transaction.fiatAmount || 0,
          'KES' // Default to KES for now
        );
      }

      // 7. Send confirmation notification
      await this.sendConfirmationNotification(transaction);

      logger.info('Payment processed successfully with treasury updates', { 
        transactionId: transaction.id,
        userId: transaction.userId,
        tokenSymbol: transaction.tokenSymbol,
        cryptoAmount: transaction.cryptoAmount,
        fiatAmount: transaction.fiatAmount,
        transactionType: transaction.transactionType
      });

      return {
        success: true,
        data: {
          success: true,
          message: 'Payment processed successfully',
          transactionId: transaction.id,
        },
      };
    } catch (error) {
      logger.error('Payment callback processing error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        checkoutRequestId: request.checkoutRequestId
      });
      
      return {
        success: false,
        error: 'Failed to process payment callback',
      };
    }
  }

  private validateCallback(request: PaymentCallbackRequest): void {
    logger.info('Validating callback request', { 
      hasCheckoutRequestId: !!request.checkoutRequestId,
      hasMerchantRequestId: !!request.merchantRequestId,
      hasResultCode: !!request.resultCode,
      checkoutRequestId: request.checkoutRequestId,
      merchantRequestId: request.merchantRequestId,
      resultCode: request.resultCode
    });

    if (!request.checkoutRequestId || request.checkoutRequestId.trim().length === 0) {
      logger.error('Validation failed: Checkout request ID is missing or empty', { 
        checkoutRequestId: request.checkoutRequestId,
        type: typeof request.checkoutRequestId
      });
      throw new Error('Checkout request ID is required');
    }
    if (!request.merchantRequestId || request.merchantRequestId.trim().length === 0) {
      logger.error('Validation failed: Merchant request ID is missing or empty', { 
        merchantRequestId: request.merchantRequestId,
        type: typeof request.merchantRequestId
      });
      throw new Error('Merchant request ID is required');
    }
    if (!request.resultCode || request.resultCode.trim().length === 0) {
      logger.error('Validation failed: Result code is missing or empty', { 
        resultCode: request.resultCode,
        type: typeof request.resultCode
      });
      throw new Error('Result code is required');
    }
  }

  private async updateTransactionStatus(checkoutRequestId: string, status: string): Promise<void> {
    try {
      const transaction = await this.walletRepository.findTransactionByCheckoutId(checkoutRequestId);
      if (transaction) {
        await this.walletRepository.updateTransactionStatus(transaction.id, status);
      }
    } catch (error) {
      logger.error('Failed to update transaction status', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        checkoutRequestId,
        status
      });
    }
  }

  private async sendConfirmationNotification(transaction: any): Promise<void> {
    try {
      const message = `Your ${transaction.tokenSymbol} ${transaction.transactionType === 'ON_RAMP' ? 'purchase' : 'sale'} of ${(transaction.cryptoAmount || 0).toFixed(6)} for ${transaction.fiatAmount} KES has been completed successfully. Receipt: ${transaction.mpesaReceiptNumber}`;
      
      await this.notificationService.sendSMSOTP(
        transaction.phoneNumber || '',
        message,
        0 // No expiration for confirmation messages
      );
    } catch (error) {
      logger.error('Failed to send confirmation notification', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: transaction.id
      });
    }
  }

  private async updateTreasuryBalances(
    transactionId: string,
    transactionType: 'ON_RAMP' | 'OFF_RAMP',
    tokenSymbol: string,
    quantity: number,
    fiatAmount: number,
    userCurrency: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const movements = [];

      if (transactionType === 'ON_RAMP') {
        // Buy crypto: User pays fiat, receives crypto
        movements.push(
          {
            accountType: 'FIAT' as const,
            assetSymbol: userCurrency,
            amount: fiatAmount, // Positive = credit to treasury (user paid)
            description: `Crypto purchase - ${fiatAmount} ${userCurrency} from user`
          },
          {
            accountType: 'CRYPTO' as const,
            assetSymbol: tokenSymbol,
            amount: -quantity, // Negative = debit from treasury (user received)
            description: `Crypto purchase - ${quantity} ${tokenSymbol} to user`
          }
        );
      } else {
        // Sell crypto: User sells crypto, receives fiat
        movements.push(
          {
            accountType: 'CRYPTO' as const,
            assetSymbol: tokenSymbol,
            amount: quantity, // Positive = credit to treasury (user sold)
            description: `Crypto sale - ${quantity} ${tokenSymbol} from user`
          },
          {
            accountType: 'FIAT' as const,
            assetSymbol: userCurrency,
            amount: -fiatAmount, // Negative = debit from treasury (user received)
            description: `Crypto sale - ${fiatAmount} ${userCurrency} to user`
          }
        );
      }

      // Process treasury transaction asynchronously
      await this.treasuryService.processTransaction({
        userTransactionId: transactionId,
        transactionType,
        movements
      });

      logger.info('Treasury balances updated for crypto transaction', {
        transactionId,
        transactionType,
        tokenSymbol,
        quantity,
        fiatAmount,
        userCurrency
      });

      return {
        success: true
      };

    } catch (error) {
      logger.error('Failed to update treasury balances', {
        transactionId,
        transactionType,
        tokenSymbol,
        quantity,
        fiatAmount,
        userCurrency,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Treasury update failed'
      };
    }
  }
}
