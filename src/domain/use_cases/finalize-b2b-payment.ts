/**
 * Finalize B2B Payment Use Case
 * Handles the finalization of B2B MPESA payments using stored quotes
 */

import { B2BPaymentService } from '../../application/interfaces/b2b-payment-service';
import { WalletRepository } from '../repositories/wallet-repository';
import { UserRepository } from '../repositories/user-repository';
import { TokenRepository } from '../repositories/token-repository';
import { NotificationService } from '../../application/interfaces/notification-service';
import { TreasuryService } from '../../application/interfaces/treasury-service';
import logger from '../../shared/logging';

export interface FinalizeB2BPaymentRequest {
  userId: string;
  quoteId: string;
}

export interface FinalizeB2BPaymentResult {
  success: boolean;
  data?: {
    transactionId: string;
    tokenSymbol: string;
    tokenAmount: number;
    fiatAmount: number;
    exchangeRate: number;
    platformFee: number;
    recipient: {
      type: string;
      businessNumber: string;
      accountNumber?: string | undefined;
      name?: string | undefined;
    };
    mpesaResponse: {
      conversationId?: string | undefined;
      originatorConversationId?: string | undefined;
      responseCode?: string | undefined;
      responseDescription?: string | undefined;
    };
    status: string;
  };
  error?: string;
}

export class FinalizeB2BPaymentUseCase {
  constructor(
    private b2bPaymentService: B2BPaymentService,
    private walletRepository: WalletRepository,
    private userRepository: UserRepository,
    private tokenRepository: TokenRepository,
    private notificationService: NotificationService,
    private treasuryService: TreasuryService
  ) {}

  async execute(request: FinalizeB2BPaymentRequest): Promise<FinalizeB2BPaymentResult> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Verify user exists and is verified
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!user.isPhoneVerified) {
        return {
          success: false,
          error: 'Phone number must be verified before making payments',
        };
      }

      // 3. Get stored quote
      const quote = await this.b2bPaymentService.getStoredQuote(request.quoteId, request.userId);
      if (!quote) {
        return {
          success: false,
          error: 'Quote not found or expired',
        };
      }

      // 4. Verify quote is still valid
      if (quote.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Quote has expired',
        };
      }

      // 5. Verify token is still supported
      const token = await this.tokenRepository.findBySymbol(quote.tokenSymbol);
      if (!token || !token.isActive) {
        return {
          success: false,
          error: 'Token is no longer supported',
        };
      }

      // 6. Check user wallet balance again
      const userBalance = await this.walletRepository.getUserTokenBalance(request.userId, quote.tokenSymbol);
      if (userBalance < quote.tokenAmount) {
        return {
          success: false,
          error: `Insufficient ${quote.tokenSymbol} balance`,
        };
      }

      // 7. Create transaction record
      const transactionId = await this.walletRepository.createTransaction({
        userId: request.userId,
        transactionType: 'PAYMENT',
        tokenSymbol: quote.tokenSymbol,
        fiatAmount: quote.fiatAmount,
        cryptoAmount: quote.tokenAmount,
        exchangeRate: quote.exchangeRate,
        platformFee: quote.platformFee,
        totalAmount: quote.fiatAmount + quote.platformFee,
        phoneNumber: user.phone || '',
        status: 'pending'
      });

      // 8. Deduct crypto from user wallet
      await this.walletRepository.updateUserTokenBalance(
        request.userId,
        quote.tokenSymbol,
        -quote.tokenAmount // Negative to deduct
      );

      // 9. Initiate B2B MPESA payment
      const paymentResult = await this.b2bPaymentService.initiateB2BPayment({
        amount: quote.fiatAmount,
        recipientType: quote.recipient.type as 'paybill' | 'till' | 'pochi',
        businessNumber: quote.recipient.businessNumber,
        accountNumber: quote.recipient.accountNumber || undefined,
        transactionId,
        description: `Payment from ${user.email} via crypto wallet`
      });

      // 10. Update transaction with payment details
      await this.walletRepository.updateTransactionPaymentDetails(transactionId, {
        originatorConversationId: paymentResult.OriginatorConversationID,
        status: paymentResult.ResponseCode === '0' ? 'processing' : 'failed'
      });

      // 11. Update treasury balances
      await this.updateTreasuryBalances(
        transactionId,
        quote.tokenSymbol,
        quote.tokenAmount,
        quote.fiatAmount,
        'KES'
      );

      // 12. Send notification
      await this.notificationService.sendNotification({
        userId: request.userId,
        type: 'b2b_payment_initiated',
        title: 'B2B Payment Initiated',
        message: `Your payment of ${quote.fiatAmount} KES to ${quote.recipient.type} ${quote.recipient.businessNumber} is being processed.`,
        data: {
          transactionId,
          tokenSymbol: quote.tokenSymbol,
          tokenAmount: quote.tokenAmount,
          fiatAmount: quote.fiatAmount,
          recipient: quote.recipient
        }
      });

      logger.info('B2B payment finalized successfully', {
        userId: request.userId,
        transactionId,
        tokenSymbol: quote.tokenSymbol,
        tokenAmount: quote.tokenAmount,
        fiatAmount: quote.fiatAmount,
        recipientType: quote.recipient.type,
        businessNumber: quote.recipient.businessNumber,
        conversationId: paymentResult.ConversationID,
        responseCode: paymentResult.ResponseCode
      });

      return {
        success: true,
        data: {
          transactionId,
          tokenSymbol: quote.tokenSymbol,
          tokenAmount: quote.tokenAmount,
          fiatAmount: quote.fiatAmount,
          exchangeRate: quote.exchangeRate,
          platformFee: quote.platformFee,
          recipient: quote.recipient,
          mpesaResponse: {
            conversationId: paymentResult.ConversationID || undefined,
            originatorConversationId: paymentResult.OriginatorConversationID || undefined,
            responseCode: paymentResult.ResponseCode || undefined,
            responseDescription: paymentResult.ResponseDescription || undefined
          },
          status: paymentResult.ResponseCode === '0' ? 'processing' : 'failed'
        }
      };
    } catch (error) {
      logger.error('Failed to finalize B2B payment', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to finalize payment'
      };
    }
  }

  private validateRequest(request: FinalizeB2BPaymentRequest): void {
    if (!request.userId || typeof request.userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!request.quoteId || typeof request.quoteId !== 'string') {
      throw new Error('Quote ID is required and must be a string');
    }
  }

  /**
   * Update treasury balances for B2B payment transactions
   * For B2B payments: User pays crypto, recipient receives fiat via MPESA
   */
  private async updateTreasuryBalances(
    transactionId: string,
    tokenSymbol: string,
    tokenAmount: number,
    fiatAmount: number,
    userCurrency: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const movements = [
        {
          accountType: 'CRYPTO' as const,
          assetSymbol: tokenSymbol,
          amount: tokenAmount, // Positive = credit to treasury (user paid crypto)
          description: `B2B payment - ${tokenAmount} ${tokenSymbol} from user`
        },
        {
          accountType: 'FIAT' as const,
          assetSymbol: userCurrency,
          amount: -fiatAmount, // Negative = debit from treasury (paid out via MPESA)
          description: `B2B payment - ${fiatAmount} ${userCurrency} paid via MPESA`
        }
      ];

      // Process treasury transaction asynchronously
      await this.treasuryService.processTransaction({
        userTransactionId: transactionId,
        transactionType: 'PAYMENT',
        movements
      });

      logger.info('Treasury balances updated for B2B payment', {
        transactionId,
        tokenSymbol,
        tokenAmount,
        fiatAmount,
        userCurrency
      });

      return {
        success: true
      };

    } catch (error) {
      logger.error('Failed to update treasury balances for B2B payment', {
        transactionId,
        tokenSymbol,
        tokenAmount,
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
