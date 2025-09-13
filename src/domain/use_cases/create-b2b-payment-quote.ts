/**
 * Create B2B Payment Quote Use Case
 * Handles B2B MPESA payment quote generation using crypto funds
 */

import { B2BPaymentService } from '../../application/interfaces/b2b-payment-service';
import { TokenRepository } from '../repositories/token-repository';
import { WalletRepository } from '../repositories/wallet-repository';
import logger from '../../shared/logging';

export interface CreateB2BPaymentQuoteRequest {
  userId: string;
  tokenSymbol: string;
  fiatAmount: number;
  recipientType: 'paybill' | 'till' | 'pochi';
  businessNumber: string;
  accountNumber?: string;
  recipientName?: string;
}

export interface B2BPaymentQuoteResponse {
  quoteId: string;
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
  expiresAt: Date;
}

export type B2BPaymentQuoteResult = {
  success: true;
  data: B2BPaymentQuoteResponse;
} | {
  success: false;
  error: string;
};

export class CreateB2BPaymentQuoteUseCase {
  constructor(
    private b2bPaymentService: B2BPaymentService,
    private tokenRepository: TokenRepository,
    private walletRepository: WalletRepository
  ) {}

  async execute(request: CreateB2BPaymentQuoteRequest): Promise<B2BPaymentQuoteResult> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Verify token is supported and active
      const token = await this.tokenRepository.findBySymbol(request.tokenSymbol);
      if (!token || !token.isActive) {
        return {
          success: false,
          error: 'Unsupported or inactive token'
        };
      }

      // 3. Validate fiat amount limits
      const minAmount = 10; // Minimum 10 KES
      const maxAmount = 70000; // Maximum for M-Pesa
      
      if (request.fiatAmount < minAmount || request.fiatAmount > maxAmount) {
        return {
          success: false,
          error: `Amount must be between ${minAmount} and ${maxAmount} KES`
        };
      }

      // 4. Check user wallet balance
      const userBalance = await this.walletRepository.getUserTokenBalance(request.userId, request.tokenSymbol);
      if (userBalance <= 0) {
        return {
          success: false,
          error: `Insufficient ${request.tokenSymbol} balance`
        };
      }

      // 5. Get current exchange rate and calculate required token amount
      const exchangeRate = await this.b2bPaymentService.getExchangeRate(request.tokenSymbol, 'KES');
      const platformFee = this.calculatePlatformFee(request.fiatAmount);
      const totalFiatRequired = request.fiatAmount + platformFee;
      
      // Convert fiat to USD first, then to token amount
      const usdRate = await this.b2bPaymentService.getExchangeRate('USD', 'KES');
      const fiatInUSD = totalFiatRequired / usdRate;
      const tokenAmount = fiatInUSD / exchangeRate;

      // 6. Check if user has sufficient token balance
      if (userBalance < tokenAmount) {
        return {
          success: false,
          error: `Insufficient ${request.tokenSymbol} balance. Required: ${tokenAmount.toFixed(6)}, Available: ${userBalance.toFixed(6)}`
        };
      }

      // 7. Create and store quote
      const quote = await this.b2bPaymentService.createB2BPaymentQuote({
        userId: request.userId,
        tokenSymbol: request.tokenSymbol,
        tokenAmount,
        fiatAmount: request.fiatAmount,
        exchangeRate,
        platformFee,
        recipient: {
          type: request.recipientType,
          businessNumber: request.businessNumber,
          accountNumber: request.accountNumber || undefined,
          name: request.recipientName || undefined
        }
      });

      logger.info('B2B payment quote created successfully', {
        userId: request.userId,
        quoteId: quote.quoteId,
        tokenSymbol: request.tokenSymbol,
        tokenAmount,
        fiatAmount: request.fiatAmount,
        recipientType: request.recipientType,
        businessNumber: request.businessNumber
      });

      return {
        success: true,
        data: quote
      };
    } catch (error) {
      logger.error('Failed to create B2B payment quote', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create quote'
      };
    }
  }

  private validateRequest(request: CreateB2BPaymentQuoteRequest): void {
    if (!request.userId || typeof request.userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!request.tokenSymbol || typeof request.tokenSymbol !== 'string') {
      throw new Error('Token symbol is required and must be a string');
    }

    if (!request.fiatAmount || typeof request.fiatAmount !== 'number' || request.fiatAmount <= 0) {
      throw new Error('Fiat amount is required and must be a positive number');
    }

    if (!request.recipientType || !['paybill', 'till', 'pochi'].includes(request.recipientType)) {
      throw new Error('Recipient type must be paybill, till, or pochi');
    }

    if (!request.businessNumber || typeof request.businessNumber !== 'string') {
      throw new Error('Business number is required and must be a string');
    }

    // Validate business number format (basic validation)
    if (!/^\d{5,10}$/.test(request.businessNumber)) {
      throw new Error('Business number must be 5-10 digits');
    }

    // Account number is required for paybill
    if (request.recipientType === 'paybill' && !request.accountNumber) {
      throw new Error('Account number is required for paybill payments');
    }

    // Validate account number if provided
    if (request.accountNumber && (typeof request.accountNumber !== 'string' || request.accountNumber.length > 50)) {
      throw new Error('Account number must be a string with maximum 50 characters');
    }

    // Validate recipient name if provided
    if (request.recipientName && (typeof request.recipientName !== 'string' || request.recipientName.length > 100)) {
      throw new Error('Recipient name must be a string with maximum 100 characters');
    }
  }

  private calculatePlatformFee(fiatAmount: number): number {
    // 2% platform fee for B2B payments
    return Math.round(fiatAmount * 0.02 * 100) / 100;
  }
}
