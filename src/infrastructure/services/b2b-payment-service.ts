/**
 * B2B Payment Service Implementation
 * Handles B2B MPESA payment operations using crypto funds
 */

import { B2BPaymentService, B2BPaymentQuote, CreateB2BPaymentQuoteRequest, InitiateB2BPaymentRequest, B2BPaymentResponse } from '../../application/interfaces/b2b-payment-service';
import { CryptoQuoteService } from '../../application/interfaces/crypto-quote-service';
import { MpesaPaymentService } from './mpesa/mpesa-payment-service';
import logger from '../../shared/logging';

export class B2BPaymentServiceImpl implements B2BPaymentService {
  private mpesaService: MpesaPaymentService;
  private quotes: Map<string, B2BPaymentQuote> = new Map(); // In-memory storage for demo

  constructor(private cryptoQuoteService: CryptoQuoteService) {
    this.mpesaService = new MpesaPaymentService();
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // For crypto to fiat rates, we need to get crypto price in USD and forex rate
    if (fromCurrency === 'USDT' || fromCurrency === 'USDC' || fromCurrency === 'BTC' || fromCurrency === 'ETH') {
      const cryptoPrice = await this.cryptoQuoteService.getCryptoPrice(fromCurrency);
      if (toCurrency === 'USD') {
        return cryptoPrice.priceInUsd;
      } else {
        const forexRate = await this.cryptoQuoteService.getForexRate('USD', toCurrency);
        return cryptoPrice.priceInUsd * forexRate.rate;
      }
    } else {
      // For fiat to fiat rates
      const forexRate = await this.cryptoQuoteService.getForexRate(fromCurrency, toCurrency);
      return forexRate.rate;
    }
  }

  async createB2BPaymentQuote(request: CreateB2BPaymentQuoteRequest): Promise<B2BPaymentQuote> {
    const quoteId = this.generateQuoteId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    const quote: B2BPaymentQuote = {
      quoteId,
      tokenSymbol: request.tokenSymbol,
      tokenAmount: request.tokenAmount,
      fiatAmount: request.fiatAmount,
      exchangeRate: request.exchangeRate,
      platformFee: request.platformFee,
      recipient: request.recipient,
      expiresAt
    };

    // Store quote (in production, use Redis or database)
    this.quotes.set(`${quoteId}_${request.userId}`, quote);

    // Clean up expired quotes periodically
    this.cleanupExpiredQuotes();

    logger.info('B2B payment quote created', {
      quoteId,
      userId: request.userId,
      tokenSymbol: request.tokenSymbol,
      tokenAmount: request.tokenAmount,
      fiatAmount: request.fiatAmount,
      expiresAt
    });

    return quote;
  }

  async getStoredQuote(quoteId: string, userId: string): Promise<B2BPaymentQuote | null> {
    const quote = this.quotes.get(`${quoteId}_${userId}`);
    
    if (!quote) {
      logger.warn('Quote not found', { quoteId, userId });
      return null;
    }

    if (quote.expiresAt < new Date()) {
      logger.warn('Quote expired', { quoteId, userId, expiresAt: quote.expiresAt });
      this.quotes.delete(`${quoteId}_${userId}`);
      return null;
    }

    return quote;
  }

  async initiateB2BPayment(request: InitiateB2BPaymentRequest): Promise<B2BPaymentResponse> {
    try {
      logger.info('Initiating B2B MPESA payment', {
        amount: request.amount,
        recipientType: request.recipientType,
        businessNumber: request.businessNumber,
        transactionId: request.transactionId
      });

      // Use the existing MPESA service to initiate B2B payment
      const response = await this.mpesaService.initiateB2BPayment({
        partyB: parseInt(request.businessNumber),
        amount: request.amount,
        accountReference: request.accountNumber || '', // Keep as string
        method: request.recipientType === 'paybill' ? 'paybill' : 
               request.recipientType === 'pochi' ? 'pochi' : 'buygoods',
        remarks: request.description
      });

      logger.info('B2B MPESA payment initiated successfully', {
        transactionId: request.transactionId,
        originatorConversationId: response.OriginatorConversationID,
        responseCode: response.ResponseCode
      });

      return {
        ConversationID: response.OriginatorConversationID,
        OriginatorConversationID: response.OriginatorConversationID,
        ResponseCode: response.ResponseCode,
        ResponseDescription: response.ResponseDescription
      };
    } catch (error) {
      logger.error('Failed to initiate B2B MPESA payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      });

      return {
        ResponseCode: '1',
        ResponseDescription: error instanceof Error ? error.message : 'Payment initiation failed'
      };
    }
  }

  validateBusinessNumber(businessNumber: string, recipientType: string): boolean {
    // Basic validation - in production, implement more comprehensive validation
    if (!businessNumber || typeof businessNumber !== 'string') {
      return false;
    }

    // Remove any non-digit characters
    const digits = businessNumber.replace(/\D/g, '');
    
    // Check length constraints
    if (digits.length < 5 || digits.length > 10) {
      return false;
    }

    // Additional validation based on recipient type could be added here
    switch (recipientType) {
      case 'paybill':
        // Paybill numbers are typically 5-7 digits
        return digits.length >= 5 && digits.length <= 7;
      case 'till':
        // Till numbers are typically 5-7 digits
        return digits.length >= 5 && digits.length <= 7;
      case 'pochi':
        // Phone numbers for pochi (typically 10 digits without country code)
        return digits.length === 10;
      default:
        return false;
    }
  }

  validateAccountNumber(accountNumber: string): boolean {
    if (!accountNumber || typeof accountNumber !== 'string') {
      return false;
    }

    // Account numbers should be 1-50 characters, alphanumeric
    return accountNumber.length >= 1 && accountNumber.length <= 50;
  }

  private generateQuoteId(): string {
    // Generate a unique quote ID
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `b2b_${timestamp}_${randomStr}`;
  }

  private cleanupExpiredQuotes(): void {
    const now = new Date();
    for (const [key, quote] of this.quotes.entries()) {
      if (quote.expiresAt < now) {
        this.quotes.delete(key);
      }
    }
  }
}
