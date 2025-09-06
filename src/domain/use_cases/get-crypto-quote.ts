/**
 * Get Crypto Quote Use Cases
 * Handles crypto price quotation requests
 */

import { CryptoQuoteService, QuantityToFiatQuoteRequest, QuantityToFiatQuoteResponse, FiatToQuantityQuoteRequest, FiatToQuantityQuoteResponse } from '../../application/interfaces/crypto-quote-service';
import { TokenRepository } from '../repositories/token-repository';
import logger from '../../shared/logging';

export interface GetQuantityToFiatQuoteRequest {
  tokenSymbol: string;
  quantity: number;
  userCurrency: string;
}

export interface GetFiatToQuantityQuoteRequest {
  tokenSymbol: string;
  fiatAmount: number;
  userCurrency: string;
}

export type QuoteResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export class GetCryptoQuoteUseCase {
  constructor(
    private cryptoQuoteService: CryptoQuoteService,
    private tokenRepository: TokenRepository
  ) {}

  async getQuantityToFiatQuote(request: GetQuantityToFiatQuoteRequest): Promise<QuoteResult<QuantityToFiatQuoteResponse>> {
    try {
      // 1. Validate request
      this.validateQuantityToFiatRequest(request);

      // 2. Verify token is supported
      const token = await this.tokenRepository.findBySymbol(request.tokenSymbol);
      if (!token || !token.isActive) {
        return {
          success: false,
          error: 'Unsupported or inactive token'
        };
      }

      // 3. Get quote from service
      const quote = await this.cryptoQuoteService.getQuantityToFiatQuote({
        tokenSymbol: request.tokenSymbol,
        quantity: request.quantity,
        userCurrency: request.userCurrency
      });

      logger.info('Quantity-to-fiat quote generated successfully', {
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
      logger.error('Failed to get quantity-to-fiat quote', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quote'
      };
    }
  }

  async getFiatToQuantityQuote(request: GetFiatToQuantityQuoteRequest): Promise<QuoteResult<FiatToQuantityQuoteResponse>> {
    try {
      // 1. Validate request
      this.validateFiatToQuantityRequest(request);

      // 2. Verify token is supported
      const token = await this.tokenRepository.findBySymbol(request.tokenSymbol);
      if (!token || !token.isActive) {
        return {
          success: false,
          error: 'Unsupported or inactive token'
        };
      }

      // 3. Validate amount limits (example: minimum 1 unit of user currency)
      const minAmount = 1;
      const maxAmount = 100000; // Reasonable maximum for quotes
      
      if (request.fiatAmount < minAmount || request.fiatAmount > maxAmount) {
        return {
          success: false,
          error: `Amount must be between ${minAmount} and ${maxAmount} ${request.userCurrency}`
        };
      }

      // 4. Get quote from service
      const quote = await this.cryptoQuoteService.getFiatToQuantityQuote({
        tokenSymbol: request.tokenSymbol,
        fiatAmount: request.fiatAmount,
        userCurrency: request.userCurrency
      });

      logger.info('Fiat-to-quantity quote generated successfully', {
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
      logger.error('Failed to get fiat-to-quantity quote', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quote'
      };
    }
  }

  private validateQuantityToFiatRequest(request: GetQuantityToFiatQuoteRequest): void {
    if (!request.tokenSymbol || typeof request.tokenSymbol !== 'string') {
      throw new Error('Token symbol is required and must be a string');
    }

    if (!request.quantity || typeof request.quantity !== 'number' || request.quantity <= 0) {
      throw new Error('Quantity is required and must be a positive number');
    }

    if (!request.userCurrency || typeof request.userCurrency !== 'string') {
      throw new Error('User currency is required and must be a string');
    }

    // Validate reasonable quantity limits
    if (request.quantity > 1000000) {
      throw new Error('Quantity too large for quotation');
    }

    if (request.quantity < 0.00000001) {
      throw new Error('Quantity too small for quotation');
    }
  }

  private validateFiatToQuantityRequest(request: GetFiatToQuantityQuoteRequest): void {
    if (!request.tokenSymbol || typeof request.tokenSymbol !== 'string') {
      throw new Error('Token symbol is required and must be a string');
    }

    if (!request.fiatAmount || typeof request.fiatAmount !== 'number' || request.fiatAmount <= 0) {
      throw new Error('Fiat amount is required and must be a positive number');
    }

    if (!request.userCurrency || typeof request.userCurrency !== 'string') {
      throw new Error('User currency is required and must be a string');
    }
  }
}
