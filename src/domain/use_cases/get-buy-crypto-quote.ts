/**
 * Get Buy Crypto Quote Use Cases
 * Handles buy crypto price quotation requests following the same pattern as sell crypto
 */

import { CryptoQuoteService, QuantityToFiatQuoteResponse, FiatToQuantityQuoteResponse } from '../../application/interfaces/crypto-quote-service';
import { TokenRepository } from '../repositories/token-repository';
import logger from '../../shared/logging';

export interface GetBuyQuantityToFiatQuoteRequest {
  tokenSymbol: string;
  quantity: number;
  userCurrency: string;
  userId: string;
}

export interface GetBuyFiatToQuantityQuoteRequest {
  tokenSymbol: string;
  fiatAmount: number;
  userCurrency: string;
  userId: string;
}

export type BuyQuoteResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export class GetBuyCryptoQuoteUseCase {
  constructor(
    private cryptoQuoteService: CryptoQuoteService,
    private tokenRepository: TokenRepository
  ) {}

  async getBuyQuantityToFiatQuote(request: GetBuyQuantityToFiatQuoteRequest): Promise<BuyQuoteResult<QuantityToFiatQuoteResponse>> {
    try {
      // 1. Validate request
      this.validateBuyQuantityToFiatRequest(request);

      // 2. Verify token is supported and active
      const token = await this.tokenRepository.findBySymbol(request.tokenSymbol);
      if (!token || !token.isActive) {
        return {
          success: false,
          error: 'Unsupported or inactive token'
        };
      }

      // 3. Validate quantity limits
      const minQuantity = 0.00000001; // Minimum 8 decimal places
      const maxQuantity = 1000000; // Reasonable maximum for quotes
      
      if (request.quantity < minQuantity || request.quantity > maxQuantity) {
        return {
          success: false,
          error: `Quantity must be between ${minQuantity} and ${maxQuantity} ${request.tokenSymbol}`
        };
      }

      // 4. Get quote from service (with storage for finalization)
      const quote = await this.cryptoQuoteService.getBuyQuantityToFiatQuote({
        tokenSymbol: request.tokenSymbol,
        quantity: request.quantity,
        userCurrency: request.userCurrency
      }, request.userId);

      logger.info('Buy quantity-to-fiat quote generated successfully', {
        userId: request.userId,
        tokenSymbol: request.tokenSymbol,
        quantity: request.quantity,
        totalCost: quote.totalInUserCurrency,
        currency: request.userCurrency
      });

      return {
        success: true,
        data: quote
      };
    } catch (error) {
      logger.error('Failed to get buy quantity-to-fiat quote', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quote'
      };
    }
  }

  async getBuyFiatToQuantityQuote(request: GetBuyFiatToQuantityQuoteRequest): Promise<BuyQuoteResult<FiatToQuantityQuoteResponse>> {
    try {
      // 1. Validate request
      this.validateBuyFiatToQuantityRequest(request);

      // 2. Verify token is supported and active
      const token = await this.tokenRepository.findBySymbol(request.tokenSymbol);
      if (!token || !token.isActive) {
        return {
          success: false,
          error: 'Unsupported or inactive token'
        };
      }

      // 3. Validate fiat amount limits
      const minAmount = 10; // Minimum 10 units of user currency
      const maxAmount = 70000; // Maximum for M-Pesa
      
      if (request.fiatAmount < minAmount || request.fiatAmount > maxAmount) {
        return {
          success: false,
          error: `Amount must be between ${minAmount} and ${maxAmount} ${request.userCurrency}`
        };
      }

      // 4. Get quote from service (with storage for finalization)
      const quote = await this.cryptoQuoteService.getBuyFiatToQuantityQuote({
        tokenSymbol: request.tokenSymbol,
        fiatAmount: request.fiatAmount,
        userCurrency: request.userCurrency
      }, request.userId);

      logger.info('Buy fiat-to-quantity quote generated successfully', {
        userId: request.userId,
        tokenSymbol: request.tokenSymbol,
        fiatAmount: request.fiatAmount,
        quantity: quote.quantity,
        currency: request.userCurrency
      });

      return {
        success: true,
        data: quote
      };
    } catch (error) {
      logger.error('Failed to get buy fiat-to-quantity quote', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quote'
      };
    }
  }

  private validateBuyQuantityToFiatRequest(request: GetBuyQuantityToFiatQuoteRequest): void {
    if (!request.tokenSymbol || typeof request.tokenSymbol !== 'string') {
      throw new Error('Token symbol is required and must be a string');
    }

    if (!request.quantity || typeof request.quantity !== 'number' || request.quantity <= 0) {
      throw new Error('Quantity is required and must be a positive number');
    }

    if (!request.userCurrency || typeof request.userCurrency !== 'string') {
      throw new Error('User currency is required and must be a string');
    }

    if (!request.userId || typeof request.userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }
  }

  private validateBuyFiatToQuantityRequest(request: GetBuyFiatToQuantityQuoteRequest): void {
    if (!request.tokenSymbol || typeof request.tokenSymbol !== 'string') {
      throw new Error('Token symbol is required and must be a string');
    }

    if (!request.fiatAmount || typeof request.fiatAmount !== 'number' || request.fiatAmount <= 0) {
      throw new Error('Fiat amount is required and must be a positive number');
    }

    if (!request.userCurrency || typeof request.userCurrency !== 'string') {
      throw new Error('User currency is required and must be a string');
    }

    if (!request.userId || typeof request.userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }
  }
}
