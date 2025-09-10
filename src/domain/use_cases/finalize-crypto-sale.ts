/**
 * Finalize Crypto Sale Use Case
 * Handles the finalization of crypto selling transactions
 */

import { CryptoQuoteService } from '../../application/interfaces/crypto-quote-service';
import { WalletRepository } from '../repositories/wallet-repository';
import { UserRepository } from '../repositories/user-repository';
import { TokenRepository } from '../repositories/token-repository';
import { NotificationService } from '../../application/interfaces/notification-service';
import { TreasuryService } from '../../application/interfaces/treasury-service';
import { MpesaPaymentService } from '../../infrastructure/services/mpesa/mpesa-payment-service';
import logger from '../../shared/logging';

export interface FinalizeCryptoSaleRequest {
  userId: string;
  quoteId: string;
  phoneNumber: string;
}

export interface FinalizeCryptoSaleResult {
  success: boolean;
  data?: {
    transactionId: string;
    tokenSymbol: string;
    quantitySold: number;
    fiatAmount: number;
    userCurrency: string;
    mpesaRequestId?: string;
    status: string;
  };
  error?: string;
}

export class FinalizeCryptoSaleUseCase {
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

  async execute(request: FinalizeCryptoSaleRequest): Promise<FinalizeCryptoSaleResult> {
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
          error: 'Phone number must be verified before selling crypto',
        };
      }

      // 3. Get and validate the stored quote
      const quote = await this.cryptoQuoteService.getStoredQuote(request.quoteId, request.userId);
      if (!quote) {
        return {
          success: false,
          error: 'Quote not found or expired. Please generate a new quote.',
        };
      }

      // 4. Verify token is still supported and active
      const token = await this.tokenRepository.findBySymbol(quote.tokenSymbol);
      if (!token || !token.isActive) {
        return {
          success: false,
          error: 'Token is no longer supported or active',
        };
      }

      // 5. Re-check user's balance (in case it changed since quote generation)
      const userAddresses = await this.walletRepository.findUserAddresses(request.userId);
      const userAddress = userAddresses.find(addr => addr.tokenSymbol === quote.tokenSymbol);

      if (!userAddress) {
        return {
          success: false,
          error: 'Wallet address not found for this token',
        };
      }

      const currentBalance = userAddress.tokenBalance || 0;
      if (currentBalance < quote.quantity) {
        return {
          success: false,
          error: `Insufficient balance. Available: ${currentBalance} ${quote.tokenSymbol}, Required: ${quote.quantity} ${quote.tokenSymbol}`,
        };
      }

      // 6. Calculate platform fee
      const platformFee = this.calculatePlatformFee(quote.fiatAmount);

      // 7. Create transaction record
      const transactionId = await this.walletRepository.createTransaction({
        userId: request.userId,
        transactionType: 'OFF_RAMP',
        tokenSymbol: quote.tokenSymbol,
        fiatAmount: quote.fiatAmount,
        cryptoAmount: quote.quantity,
        exchangeRate: quote.exchangeRate,
        platformFee,
        totalAmount: quote.fiatAmount, // This is what user receives
        phoneNumber: request.phoneNumber,
        status: 'pending'
      });

      // 8. Update treasury balances (pooled wallet model)
      const treasuryUpdateResult = await this.updateTreasuryBalances(
        transactionId,
        'OFF_RAMP',
        quote.tokenSymbol,
        quote.quantity,
        quote.fiatAmount,
        quote.userCurrency
      );

      if (!treasuryUpdateResult.success) {
        await this.walletRepository.updateTransactionStatus(transactionId, 'failed');
        return {
          success: false,
          error: 'Failed to update treasury balances',
        };
      }

      // 9. Update user's token balance
      await this.walletRepository.updateUserTokenBalance(
        request.userId, 
        quote.tokenSymbol, 
        currentBalance - quote.quantity
      );

      // 10. Initiate M-Pesa B2C payment (disbursement to user)
      const mpesaResult = await this.mpesaService.initiateB2CPayment({
        phoneNumber: request.phoneNumber,
        amount: quote.fiatAmount,
        transactionId: transactionId,
        remarks: `Crypto sale - ${quote.tokenSymbol}`
      });

      // 11. Update transaction with payment details and mark as completed
      // For sell crypto, this is a start-to-finish transaction
      await this.walletRepository.updateTransactionPaymentDetails(transactionId, {
        status: 'completed',
        originatorConversationId: mpesaResult.OriginatorConversationID || undefined,
        mpesaReceiptNumber: mpesaResult.OriginatorConversationID || undefined
      });

      // 12. Send notification SMS
      await this.notificationService.sendSMSOTP(
        request.phoneNumber,
        `Your ${quote.tokenSymbol} sale of ${quote.quantity} for ${quote.fiatAmount} ${quote.userCurrency} has been completed successfully. M-Pesa payment: ${mpesaResult.OriginatorConversationID || 'Processing'}`,
        300
      );

      // 13. Cleanup the used quote
      // Note: The quote will be automatically cleaned up by the service's cleanup process

      logger.info('Crypto sale finalized successfully', { 
        userId: request.userId,
        transactionId,
        quoteId: request.quoteId,
        tokenSymbol: quote.tokenSymbol,
        quantitySold: quote.quantity,
        fiatAmount: quote.fiatAmount,
        originatorConversationId: mpesaResult.OriginatorConversationID
      });

      return {
        success: true,
        data: {
          transactionId,
          tokenSymbol: quote.tokenSymbol,
          quantitySold: quote.quantity,
          fiatAmount: quote.fiatAmount,
          userCurrency: quote.userCurrency,
          mpesaRequestId: mpesaResult.OriginatorConversationID || '',
          status: 'completed'
        }
      };

    } catch (error) {
      logger.error('Failed to finalize crypto sale', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to finalize crypto sale'
      };
    }
  }

  private validateRequest(request: FinalizeCryptoSaleRequest): void {
    if (!request.userId || typeof request.userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!request.quoteId || typeof request.quoteId !== 'string') {
      throw new Error('Quote ID is required and must be a string');
    }

    if (!request.phoneNumber || typeof request.phoneNumber !== 'string') {
      throw new Error('Phone number is required and must be a string');
    }

    // Basic phone number validation (Kenyan format)
    const phoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(request.phoneNumber)) {
      throw new Error('Invalid phone number format');
    }
  }

  private calculatePlatformFee(fiatAmount: number): number {
    // 1% platform fee for selling
    return fiatAmount * 0.01;
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
