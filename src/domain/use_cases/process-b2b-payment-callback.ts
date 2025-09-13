/**
 * Process B2B Payment Callback Use Case
 * Handles M-Pesa B2B payment callbacks and updates transaction status and treasury balances
 */

import { WalletRepository } from '../repositories/wallet-repository';
import { UserRepository } from '../repositories/user-repository';
import { NotificationService } from '../../application/interfaces/notification-service';
import { TreasuryService } from '../../application/interfaces/treasury-service';
import logger from '../../shared/logging';

export interface B2BPaymentCallbackRequest {
  conversationId: string;
  originatorConversationId: string;
  resultCode: string;
  resultDesc: string;
  transactionId?: string;
  amount?: number;
  recipientNumber?: string;
  transactionCompletedDateTime?: string;
  b2CReceiverAccountType?: string;
  transactionReceipt?: string;
  b2CChargesPaidAccountAvailableFunds?: number;
  receiverPartyPublicName?: string;
  b2CUtilityAccountAvailableFunds?: number;
  b2CWorkingAccountAvailableFunds?: number;
}

export interface B2BPaymentCallbackResult {
  success: boolean;
  data?: {
    transactionId: string;
    status: string;
    message: string;
  };
  error?: string;
}

export class ProcessB2BPaymentCallbackUseCase {
  constructor(
    private walletRepository: WalletRepository,
    private userRepository: UserRepository,
    private notificationService: NotificationService,
    private treasuryService: TreasuryService
  ) {}

  async execute(request: B2BPaymentCallbackRequest): Promise<B2BPaymentCallbackResult> {
    try {
      // 1. Validate callback data
      this.validateCallback(request);

      logger.info('B2B payment callback received', {
        conversationId: request.conversationId,
        originatorConversationId: request.originatorConversationId,
        resultCode: request.resultCode,
        resultDesc: request.resultDesc
      });

      // 2. Find transaction by originator conversation ID
      const transaction = await this.walletRepository.findTransactionByOriginatorConversationId(
        request.originatorConversationId
      );

      if (!transaction) {
        logger.error('B2B transaction not found', {
          originatorConversationId: request.originatorConversationId,
          conversationId: request.conversationId
        });
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      // 3. Check if payment was successful
      const isSuccess = request.resultCode === '0';
      const newStatus = isSuccess ? 'completed' : 'failed';

      logger.info('Processing B2B payment callback', {
        transactionId: transaction.id,
        isSuccess,
        newStatus,
        resultCode: request.resultCode,
        resultDesc: request.resultDesc
      });

      // 4. Update transaction status and payment details
      const paymentDetails: any = {
        status: newStatus,
        conversationId: request.conversationId,
        originatorConversationId: request.originatorConversationId,
        resultCode: request.resultCode,
        resultDesc: request.resultDesc
      };

      if (request.transactionReceipt) {
        paymentDetails.mpesaReceiptNumber = request.transactionReceipt;
      }
      if (request.transactionCompletedDateTime) {
        paymentDetails.transactionDate = request.transactionCompletedDateTime;
      }

      await this.walletRepository.updateTransactionPaymentDetails(transaction.id, paymentDetails);

      // 5. Handle successful payment
      if (isSuccess) {
        await this.handleSuccessfulPayment(transaction, request);
      } else {
        await this.handleFailedPayment(transaction, request);
      }

      // 6. Send notification to user
      await this.sendPaymentNotification(transaction, isSuccess, request);

      logger.info('B2B payment callback processed successfully', {
        transactionId: transaction.id,
        status: newStatus,
        userId: transaction.userId
      });

      return {
        success: true,
        data: {
          transactionId: transaction.id,
          status: newStatus,
          message: isSuccess ? 'Payment completed successfully' : 'Payment failed'
        }
      };

    } catch (error) {
      logger.error('B2B payment callback processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        originatorConversationId: request.originatorConversationId,
        conversationId: request.conversationId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Callback processing failed'
      };
    }
  }

  private validateCallback(request: B2BPaymentCallbackRequest): void {
    if (!request.conversationId) {
      throw new Error('Conversation ID is required');
    }
    if (!request.originatorConversationId) {
      throw new Error('Originator Conversation ID is required');
    }
    if (!request.resultCode) {
      throw new Error('Result code is required');
    }
    if (!request.resultDesc) {
      throw new Error('Result description is required');
    }
  }

  private async handleSuccessfulPayment(
    transaction: any,
    _callbackData: B2BPaymentCallbackRequest
  ): Promise<void> {
    try {
      // For B2B payments, the user has already paid crypto and the payment was sent to the recipient
      // We need to finalize the treasury balances that were already updated during finalization
      
      // The treasury balances were already updated in the finalize-b2b-payment use case
      // Here we just need to confirm the transaction is complete
      
      logger.info('B2B payment successful - treasury balances already updated during finalization', {
        transactionId: transaction.id,
        tokenSymbol: transaction.tokenSymbol,
        tokenAmount: transaction.cryptoAmount,
        fiatAmount: transaction.fiatAmount
      });

      // Update transaction status to completed
      await this.walletRepository.updateTransactionStatus(transaction.id, 'completed');

    } catch (error) {
      logger.error('Failed to handle successful B2B payment', {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async handleFailedPayment(
    transaction: any,
    callbackData: B2BPaymentCallbackRequest
  ): Promise<void> {
    try {
      // Payment failed - we need to reverse the crypto deduction and treasury changes
      logger.warn('B2B payment failed - reversing crypto deduction and treasury changes', {
        transactionId: transaction.id,
        resultCode: callbackData.resultCode,
        resultDesc: callbackData.resultDesc,
        tokenSymbol: transaction.tokenSymbol,
        tokenAmount: transaction.cryptoAmount
      });

      // 1. Reverse the crypto deduction from user's wallet
      if (transaction.cryptoAmount > 0) {
        await this.walletRepository.updateUserTokenBalance(
          transaction.userId,
          transaction.tokenSymbol,
          transaction.cryptoAmount // Positive to add back the deducted amount
        );

        logger.info('Reversed crypto deduction from user wallet', {
          userId: transaction.userId,
          tokenSymbol: transaction.tokenSymbol,
          amount: transaction.cryptoAmount
        });
      }

      // 2. Reverse treasury balances
      await this.reverseTreasuryBalances(
        transaction.id,
        transaction.tokenSymbol,
        transaction.cryptoAmount,
        transaction.fiatAmount
      );

      // 3. Update transaction status to failed
      await this.walletRepository.updateTransactionStatus(transaction.id, 'failed');

    } catch (error) {
      logger.error('Failed to handle failed B2B payment reversal', {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async reverseTreasuryBalances(
    transactionId: string,
    tokenSymbol: string,
    tokenAmount: number,
    fiatAmount: number
  ): Promise<void> {
    try {
      const movements = [
        {
          accountType: 'CRYPTO' as const,
          assetSymbol: tokenSymbol,
          amount: -tokenAmount, // Negative to reverse the credit
          description: `B2B payment failed - reverse ${tokenAmount} ${tokenSymbol} credit`
        },
        {
          accountType: 'FIAT' as const,
          assetSymbol: 'KES',
          amount: fiatAmount, // Positive to reverse the debit
          description: `B2B payment failed - reverse ${fiatAmount} KES debit`
        }
      ];

      await this.treasuryService.processTransaction({
        userTransactionId: `${transactionId}_reversal`,
        transactionType: 'PAYMENT',
        movements
      });

      logger.info('Treasury balances reversed for failed B2B payment', {
        transactionId,
        tokenSymbol,
        tokenAmount,
        fiatAmount
      });

    } catch (error) {
      logger.error('Failed to reverse treasury balances', {
        transactionId,
        tokenSymbol,
        tokenAmount,
        fiatAmount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async sendPaymentNotification(
    transaction: any,
    isSuccess: boolean,
    callbackData: B2BPaymentCallbackRequest
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(transaction.userId);
      if (!user) {
        logger.warn('User not found for notification', { userId: transaction.userId });
        return;
      }

      const message = isSuccess
        ? `Success! Your payment of ${transaction.fiatAmount} KES has been sent successfully. Receipt: ${callbackData.transactionReceipt || 'N/A'}`
        : `Payment failed: ${callbackData.resultDesc}. Your ${transaction.tokenSymbol} balance has been restored.`;

      await this.notificationService.sendNotification({
        userId: transaction.userId,
        type: isSuccess ? 'b2b_payment_success' : 'b2b_payment_failed',
        title: isSuccess ? 'Payment Successful' : 'Payment Failed',
        message,
        data: {
          transactionId: transaction.id,
          tokenSymbol: transaction.tokenSymbol,
          tokenAmount: transaction.cryptoAmount,
          fiatAmount: transaction.fiatAmount,
          status: isSuccess ? 'completed' : 'failed',
          receipt: callbackData.transactionReceipt
        }
      });

      logger.info('B2B payment notification sent', {
        userId: transaction.userId,
        transactionId: transaction.id,
        isSuccess
      });

    } catch (error) {
      logger.error('Failed to send B2B payment notification', {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
