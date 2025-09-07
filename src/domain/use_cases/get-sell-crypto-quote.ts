/**
 * Get Sell Crypto Quote Use Cases
 * Handles crypto selling quotation requests
 */

import { 
  CryptoQuoteService, 
  SellQuantityToFiatQuoteResponse, 
  SellFiatToQuantityQuoteResponse 
} from '../../application/interfaces/crypto-quote-service';
import { TokenRepository } from '../repositories/token-repository';
import { WalletRepository } from '../repositories/wallet-repository';
import logger from '../../shared/logging';

export interface GetSellQuantityToFiatQuoteRequest {
  userId: string;
  tokenSymbol: string;
  quantity: number;
  userCurrency: string;
}

export interface GetSellFiatToQuantityQuoteRequest {
  userId: string;
  tokenSymbol: string;
  fiatAmount: number;
  userCurrency: string;
}

export type SellQuoteResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export class GetSellCryptoQuoteUseCase {
  constructor(
    private cryptoQuoteService: CryptoQuoteService,
    private tokenRepository: TokenRepository,
    private walletRepository: WalletRepository
  ) {}

  async getSellQuantityToFiatQuote(request: GetSellQuantityToFiatQuoteRequest): Promise<SellQuoteResult<SellQuantityToFiatQuoteResponse>> {
    try {
      // 1. Validate request
      this.validateSellQuantityToFiatRequest(request);

      // 2. Verify token is supported and active
      const token = await this.tokenRepository.findBySymbol(request.tokenSymbol);
      if (!token || !token.isActive) {
        return {
          success: false,
          error: 'Unsupported or inactive token'
        };
      }

      // 3. Check user's balance for this token
      const userAddresses = await this.walletRepository.findUserAddresses(request.userId);
      const userAddress = userAddresses.find(addr => addr.tokenSymbol === request.tokenSymbol.toUpperCase());

      if (!userAddress) {
        return {
          success: false,
          error: 'No wallet address found for this token'
        };
      }

      const userBalance = userAddress.tokenBalance || 0;
      if (userBalance < request.quantity) {
        return {
          success: false,
          error: `Insufficient balance. Available: ${userBalance} ${request.tokenSymbol}, Required: ${request.quantity} ${request.tokenSymbol}`
        };
      }

      // 4. Validate quantity limits (minimum sell amount)
      const minQuantity = this.getMinSellQuantity(request.tokenSymbol);
      if (request.quantity < minQuantity) {
        return {
          success: false,
          error: `Minimum sell amount is ${minQuantity} ${request.tokenSymbol}`
        };
      }

      // 5. Get quote from service
      const quote = await this.cryptoQuoteService.getSellQuantityToFiatQuote({
        tokenSymbol: request.tokenSymbol,
        quantity: request.quantity,
        userCurrency: request.userCurrency
      }, request.userId);

      logger.info('Sell quantity-to-fiat quote generated successfully', {
        userId: request.userId,
        quoteId: quote.quoteId,
        tokenSymbol: request.tokenSymbol,
        quantity: request.quantity,
        netAmountToUser: quote.netAmountToUser,
        currency: request.userCurrency
      });

      return {
        success: true,
        data: quote
      };
    } catch (error) {
      logger.error('Failed to get sell quantity-to-fiat quote', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sell quote'
      };
    }
  }

  async getSellFiatToQuantityQuote(request: GetSellFiatToQuantityQuoteRequest): Promise<SellQuoteResult<SellFiatToQuantityQuoteResponse>> {
    try {
      // 1. Validate request
      this.validateSellFiatToQuantityRequest(request);

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

      // 4. Get quote from service first to check required quantity
      const quote = await this.cryptoQuoteService.getSellFiatToQuantityQuote({
        tokenSymbol: request.tokenSymbol,
        fiatAmount: request.fiatAmount,
        userCurrency: request.userCurrency
      }, request.userId);

      // 5. Check user's balance for the required quantity
      const userAddresses = await this.walletRepository.findUserAddresses(request.userId);
      const userAddress = userAddresses.find(addr => addr.tokenSymbol === request.tokenSymbol.toUpperCase());

      if (!userAddress) {
        return {
          success: false,
          error: 'No wallet address found for this token'
        };
      }

      const userBalance = userAddress.tokenBalance || 0;
      if (userBalance < quote.totalQuantityToSell) {
        return {
          success: false,
          error: `Insufficient balance. Available: ${userBalance} ${request.tokenSymbol}, Required: ${quote.totalQuantityToSell} ${request.tokenSymbol}`
        };
      }

      logger.info('Sell fiat-to-quantity quote generated successfully', {
        userId: request.userId,
        quoteId: quote.quoteId,
        tokenSymbol: request.tokenSymbol,
        fiatAmount: request.fiatAmount,
        requiredQuantity: quote.totalQuantityToSell,
        currency: request.userCurrency
      });

      return {
        success: true,
        data: quote
      };
    } catch (error) {
      logger.error('Failed to get sell fiat-to-quantity quote', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sell quote'
      };
    }
  }

  private validateSellQuantityToFiatRequest(request: GetSellQuantityToFiatQuoteRequest): void {
    if (!request.userId || typeof request.userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

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

  private validateSellFiatToQuantityRequest(request: GetSellFiatToQuantityQuoteRequest): void {
    if (!request.userId || typeof request.userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

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

  private getMinSellQuantity(tokenSymbol: string): number {
    // Define minimum sell quantities for different tokens
    const minQuantities: Record<string, number> = {
      'BTC': 0.0001,
      'ETH': 0.001,
      'ADA': 1,
      'SOL': 0.01,
      'USDT': 1,
      'USDC': 1
    };

    return minQuantities[tokenSymbol.toUpperCase()] || 0.00000001;
  }
}
