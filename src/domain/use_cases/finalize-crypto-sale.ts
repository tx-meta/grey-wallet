/**
 * Finalize Crypto Sale Use Case
 * Handles the finalization of crypto selling transactions
 */

import { CryptoQuoteService } from '../../application/interfaces/crypto-quote-service';
// PaymentService import removed as we're simulating payouts for now
import { WalletRepository } from '../repositories/wallet-repository';
import { UserRepository } from '../repositories/user-repository';
import { TokenRepository } from '../repositories/token-repository';
import { NotificationService } from '../../application/interfaces/notification-service';
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
  constructor(
    private cryptoQuoteService: CryptoQuoteService,
    private walletRepository: WalletRepository,
    private userRepository: UserRepository,
    private tokenRepository: TokenRepository,
    private notificationService: NotificationService
  ) {}

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

      // 8. Transfer crypto from user to treasury wallet
      const treasuryTransferResult = await this.transferToTreasuryWallet(
        quote.tokenSymbol,
        quote.quantity,
        userAddress.address
      );

      if (!treasuryTransferResult.success) {
        await this.walletRepository.updateTransactionStatus(transactionId, 'failed');
        return {
          success: false,
          error: 'Failed to transfer crypto to treasury wallet',
        };
      }

      // 9. Update user's token balance
      await this.walletRepository.updateUserTokenBalance(
        request.userId, 
        quote.tokenSymbol, 
        currentBalance - quote.quantity
      );

      // 10. For now, we simulate the M-Pesa payout process
      // In a real implementation, this would use M-Pesa B2C API
      const mpesaResult = await this.simulateMpesaPayout({
        amount: quote.fiatAmount,
        phoneNumber: request.phoneNumber,
        accountReference: transactionId,
        transactionDesc: `Crypto sale - ${quote.tokenSymbol}`
      });

      if (!mpesaResult.success) {
        // Rollback the balance update
        await this.walletRepository.updateUserTokenBalance(
          request.userId, 
          quote.tokenSymbol, 
          currentBalance
        );
        
        await this.walletRepository.updateTransactionStatus(transactionId, 'failed');
        
        return {
          success: false,
          error: 'Failed to initiate M-Pesa payment',
        };
      }

      // 11. Update transaction with payment details
      const paymentDetails: any = { status: 'processing' };
      if (mpesaResult.checkoutRequestId) {
        paymentDetails.checkoutRequestId = mpesaResult.checkoutRequestId;
      }
      if (mpesaResult.merchantRequestId) {
        paymentDetails.merchantRequestId = mpesaResult.merchantRequestId;
      }
      await this.walletRepository.updateTransactionPaymentDetails(transactionId, paymentDetails);

      // 12. Send notification SMS
      await this.notificationService.sendSMSOTP(
        request.phoneNumber,
        `Your ${quote.tokenSymbol} sale of ${quote.quantity} for ${quote.fiatAmount} ${quote.userCurrency} has been completed successfully. M-Pesa payment will be processed shortly.`,
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
        fiatAmount: quote.fiatAmount
      });

      return {
        success: true,
        data: {
          transactionId,
          tokenSymbol: quote.tokenSymbol,
          quantitySold: quote.quantity,
          fiatAmount: quote.fiatAmount,
          userCurrency: quote.userCurrency,
          mpesaRequestId: mpesaResult.checkoutRequestId || '',
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

  private async transferToTreasuryWallet(
    tokenSymbol: string, 
    quantity: number, 
    fromAddress: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Get treasury wallet address for this token
      const treasuryAddress = this.getTreasuryWalletAddress(tokenSymbol);
      if (!treasuryAddress) {
        throw new Error(`No treasury wallet configured for ${tokenSymbol}`);
      }

      // For now, we'll simulate the transfer
      // In a real implementation, this would:
      // 1. Get the wallet's private key from vault
      // 2. Create and sign a transaction
      // 3. Broadcast to the blockchain
      // 4. Wait for confirmation

      logger.info('Simulating crypto transfer to treasury', {
        tokenSymbol,
        quantity,
        fromAddress,
        toAddress: treasuryAddress
      });

      // Simulate a successful transfer
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`
      };

    } catch (error) {
      logger.error('Failed to transfer to treasury wallet', {
        tokenSymbol,
        quantity,
        fromAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed'
      };
    }
  }

  private getTreasuryWalletAddress(tokenSymbol: string): string | null {
    // Get treasury wallet addresses from environment variables
    const treasuryWallets: Record<string, string> = {
      'BTC': process.env['TREASURY_WALLET_BTC'] || '',
      'ETH': process.env['TREASURY_WALLET_ETH'] || '',
      'ADA': process.env['TREASURY_WALLET_ADA'] || '',
      'SOL': process.env['TREASURY_WALLET_SOL'] || '',
      'USDT': process.env['TREASURY_WALLET_USDT'] || '',
      'USDC': process.env['TREASURY_WALLET_USDC'] || ''
    };

    const address = treasuryWallets[tokenSymbol.toUpperCase()];
    return address || null;
  }

  private async simulateMpesaPayout(request: {
    amount: number;
    phoneNumber: string;
    accountReference: string;
    transactionDesc: string;
  }): Promise<{ success: boolean; checkoutRequestId?: string; merchantRequestId?: string; error?: string }> {
    try {
      // In a real implementation, this would use the paymentService to initiate M-Pesa B2C payout
      // For now, we simulate a successful payout and mark the transaction as completed
      
      logger.info('Simulating M-Pesa payout', {
        amount: request.amount,
        phoneNumber: request.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        accountReference: request.accountReference,
        transactionDesc: request.transactionDesc
      });

      // Mark transaction as completed since we're simulating
      await this.walletRepository.updateTransactionStatus(request.accountReference, 'completed');

      return {
        success: true,
        checkoutRequestId: `SELL_${request.accountReference}`,
        merchantRequestId: `SELL_MERCHANT_${request.accountReference}`
      };
    } catch (error) {
      logger.error('Failed to simulate M-Pesa payout', {
        error: error instanceof Error ? error.message : 'Unknown error',
        accountReference: request.accountReference
      });

      return {
        success: false,
        error: 'Failed to process payout'
      };
    }
  }
}
