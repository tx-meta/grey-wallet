/**
 * Finalize Crypto Purchase Use Case
 * Handles the finalization of crypto purchases using stored quotes
 * Follows the same pattern as FinalizeCryptoSaleUseCase
 */

import { CryptoQuoteService } from '../../application/interfaces/crypto-quote-service';
import { WalletRepository } from '../repositories/wallet-repository';
import { UserRepository } from '../repositories/user-repository';
import { TokenRepository } from '../repositories/token-repository';
import { NotificationService } from '../../application/interfaces/notification-service';
import { TreasuryService } from '../../application/interfaces/treasury-service';
import { MpesaPaymentService } from '../../infrastructure/services/mpesa/mpesa-payment-service';
import logger from '../../shared/logging';

export interface FinalizeCryptoPurchaseRequest {
  userId: string;
  quoteId: string;
  phoneNumber: string;
}

export interface FinalizeCryptoPurchaseResult {
  success: boolean;
  data?: {
    transactionId: string;
    tokenSymbol: string;
    quantityPurchased: number;
    fiatAmount: number;
    exchangeRate: number;
    platformFee: number;
    totalAmount: number;
    status: string;
  };
  error?: string;
}

export class FinalizeCryptoPurchaseUseCase {
  private mpesaService: MpesaPaymentService;

  constructor(
    private cryptoQuoteService: CryptoQuoteService,
    private walletRepository: WalletRepository,
    private userRepository: UserRepository,
    private tokenRepository: TokenRepository,
    private notificationService: NotificationService,
    private treasuryService: TreasuryService
  ) {
    this.mpesaService = new MpesaPaymentService();
  }

  async execute(request: FinalizeCryptoPurchaseRequest): Promise<FinalizeCryptoPurchaseResult> {
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
          error: 'Phone number must be verified before making purchases',
        };
      }

      // 3. Get stored quote
      const quote = await this.cryptoQuoteService.getStoredQuote(request.quoteId, request.userId);
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

      // 6. Calculate platform fee
      const platformFee = this.calculatePlatformFee(quote.fiatAmount);
      const totalAmount = quote.fiatAmount + platformFee;

      // 7. Create transaction record
      const transactionId = await this.walletRepository.createTransaction({
        userId: request.userId,
        transactionType: 'ON_RAMP',
        tokenSymbol: quote.tokenSymbol,
        fiatAmount: quote.fiatAmount,
        cryptoAmount: quote.quantity,
        exchangeRate: quote.exchangeRate,
        platformFee,
        totalAmount,
        phoneNumber: request.phoneNumber,
        status: 'pending'
      });

      // 8. Initiate M-Pesa STK Push payment
      const paymentResult = await this.mpesaService.initiateSTKPush({
        phoneNumber: request.phoneNumber,
        amount: totalAmount,
        accountReference: transactionId,
        transactionDesc: `Crypto purchase - ${quote.tokenSymbol}`
      });

      // 9. Update transaction with payment details
      await this.walletRepository.updateTransactionPaymentDetails(transactionId, {
        checkoutRequestId: paymentResult.CheckoutRequestID || undefined,
        merchantRequestId: paymentResult.MerchantRequestID || undefined,
        status: 'processing'
      });

      // 10. Send notification
      await this.notificationService.sendNotification({
        userId: request.userId,
        type: 'transaction_initiated',
        title: 'Crypto Purchase Initiated',
        message: `Your ${quote.tokenSymbol} purchase of ${quote.quantity} tokens is being processed.`,
        data: {
          transactionId,
          tokenSymbol: quote.tokenSymbol,
          quantity: quote.quantity,
          fiatAmount: quote.fiatAmount
        }
      });

      logger.info('Crypto purchase finalized successfully', {
        userId: request.userId,
        transactionId,
        tokenSymbol: quote.tokenSymbol,
        quantity: quote.quantity,
        fiatAmount: quote.fiatAmount,
        checkoutRequestId: paymentResult.CheckoutRequestID,
        merchantRequestId: paymentResult.MerchantRequestID
      });

      return {
        success: true,
        data: {
          transactionId,
          tokenSymbol: quote.tokenSymbol,
          quantityPurchased: quote.quantity,
          fiatAmount: quote.fiatAmount,
          exchangeRate: quote.exchangeRate,
          platformFee,
          totalAmount,
          status: 'processing'
        }
      };
    } catch (error) {
      logger.error('Failed to finalize crypto purchase', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to finalize purchase'
      };
    }
  }

  private validateRequest(request: FinalizeCryptoPurchaseRequest): void {
    if (!request.userId || typeof request.userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!request.quoteId || typeof request.quoteId !== 'string') {
      throw new Error('Quote ID is required and must be a string');
    }

    if (!request.phoneNumber || typeof request.phoneNumber !== 'string') {
      throw new Error('Phone number is required and must be a string');
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^254[0-9]{9}$/;
    if (!phoneRegex.test(request.phoneNumber)) {
      throw new Error('Invalid phone number format. Use format: 254XXXXXXXXX');
    }
  }

  private calculatePlatformFee(fiatAmount: number): number {
    // 1% platform fee for purchases
    return Math.round(fiatAmount * 0.01 * 100) / 100;
  }

  /**
   * Update treasury balances for crypto transactions
   * Handles both buy (ON_RAMP) and sell (OFF_RAMP) transactions
   */
  async updateTreasuryBalances(
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
