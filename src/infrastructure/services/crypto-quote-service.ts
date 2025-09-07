/**
 * Crypto Quote Service Implementation
 * Real implementation using CoinGecko and ExchangeRate APIs
 */

import { 
  CryptoQuoteService, 
  CryptoPrice, 
  ForexRate, 
  QuantityToFiatQuoteRequest,
  QuantityToFiatQuoteResponse,
  FiatToQuantityQuoteRequest,
  FiatToQuantityQuoteResponse,
  SellQuantityToFiatQuoteRequest,
  SellQuantityToFiatQuoteResponse,
  SellFiatToQuantityQuoteRequest,
  SellFiatToQuantityQuoteResponse,
  StoredQuote
} from '../../application/interfaces/crypto-quote-service';
import logger from '../../shared/logging';

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
  };
}

interface ExchangeRateResponse {
  result: string;
  conversion_rates: {
    [key: string]: number;
  };
}

export class CryptoQuoteServiceImpl implements CryptoQuoteService {
  private readonly API_EXCHANGE_RATE = "https://v6.exchangerate-api.com/v6";
  private readonly API_COINGECKO = "https://api.coingecko.com/api/v3/simple/price";
  private readonly EXCHANGE_RATE_API_KEY: string;

  // Cache for prices and rates (5 minute cache)
  private priceCache = new Map<string, { data: CryptoPrice; expiry: number }>();
  private forexCache = new Map<string, { data: ForexRate; expiry: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Quote storage for sell transactions (in-memory for now)
  private quoteStorage = new Map<string, StoredQuote>();
  private readonly QUOTE_DURATION = 5 * 60 * 1000; // 5 minutes quote validity

  // Token symbol mapping for CoinGecko
  private readonly tokenMapping: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum', 
    'ADA': 'cardano',
    'SOL': 'solana',
    'USDT': 'tether',
    'USDC': 'usd-coin'
  };

  constructor() {
    this.EXCHANGE_RATE_API_KEY = process.env['EXCHANGE_RATE_API_KEY'] || '';
    
    if (!this.EXCHANGE_RATE_API_KEY) {
      logger.warn('EXCHANGE_RATE_API_KEY not provided, using free tier with limitations');
    }
  }

  async getCryptoPrice(tokenSymbol: string): Promise<CryptoPrice> {
    const cacheKey = tokenSymbol.toUpperCase();
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      const coinGeckoId = this.tokenMapping[tokenSymbol.toUpperCase()];
      if (!coinGeckoId) {
        throw new Error(`Unsupported token: ${tokenSymbol}`);
      }

      const url = `${this.API_COINGECKO}?ids=${coinGeckoId}&vs_currencies=usd`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as CoinGeckoResponse;
      const price = data[coinGeckoId]?.usd;

      if (typeof price !== 'number') {
        throw new Error(`Invalid price data for ${tokenSymbol}`);
      }

      const cryptoPrice: CryptoPrice = {
        symbol: tokenSymbol.toUpperCase(),
        priceInUsd: price,
        lastUpdated: new Date()
      };

      // Cache the result
      this.priceCache.set(cacheKey, {
        data: cryptoPrice,
        expiry: Date.now() + this.CACHE_DURATION
      });

      logger.info('Crypto price fetched successfully', {
        symbol: tokenSymbol,
        price: price,
        source: 'coingecko'
      });

      return cryptoPrice;
    } catch (error) {
      logger.error('Failed to fetch crypto price', {
        symbol: tokenSymbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to get price for ${tokenSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getForexRate(fromCurrency: string, toCurrency: string): Promise<ForexRate> {
    // USD to USD is always 1
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        rate: 1,
        lastUpdated: new Date()
      };
    }

    const cacheKey = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
    const cached = this.forexCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      // ExchangeRate API uses USD as base, so we need to handle conversions
      let url: string;
      if (this.EXCHANGE_RATE_API_KEY) {
        url = `${this.API_EXCHANGE_RATE}/${this.EXCHANGE_RATE_API_KEY}/latest/${fromCurrency.toUpperCase()}`;
      } else {
        // Use free tier endpoint (limited requests)
        url = `${this.API_EXCHANGE_RATE}/latest/${fromCurrency.toUpperCase()}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`ExchangeRate API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as ExchangeRateResponse;

      if (data.result !== 'success') {
        throw new Error('Invalid response from ExchangeRate API');
      }

      const rate = data.conversion_rates[toCurrency.toUpperCase()];
      if (typeof rate !== 'number') {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      const forexRate: ForexRate = {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        rate,
        lastUpdated: new Date()
      };

      // Cache the result
      this.forexCache.set(cacheKey, {
        data: forexRate,
        expiry: Date.now() + this.CACHE_DURATION
      });

      logger.info('Forex rate fetched successfully', {
        from: fromCurrency,
        to: toCurrency,
        rate: rate,
        source: 'exchangerate-api'
      });

      return forexRate;
    } catch (error) {
      logger.error('Failed to fetch forex rate', {
        from: fromCurrency,
        to: toCurrency,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to get exchange rate from ${fromCurrency} to ${toCurrency}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  applyForexSpread(rate: number, isUserCurrencyToUsd: boolean): number {
    // Apply 0.5% spread to forex rate for profit margin
    const spreadPercentage = 0.005; // 0.5%
    
    if (isUserCurrencyToUsd) {
      // When converting user currency to USD, we apply spread to get less USD for user
      // This means we multiply by (1 - spread) to get a lower rate
      return rate * (1 - spreadPercentage);
    } else {
      // When converting USD to user currency, we apply spread to get more user currency cost
      // This means we multiply by (1 + spread) to get a higher rate
      return rate * (1 + spreadPercentage);
    }
  }

  async getQuantityToFiatQuote(request: QuantityToFiatQuoteRequest): Promise<QuantityToFiatQuoteResponse> {
    try {
      // 1. Get current crypto price in USD
      const cryptoPrice = await this.getCryptoPrice(request.tokenSymbol);
      
      // 2. Calculate total USD value
      const totalUsd = request.quantity * cryptoPrice.priceInUsd;
      
      // 3. Get exchange rate from USD to user currency
      const baseForexRate = await this.getForexRate('USD', request.userCurrency);
      
      // 4. Apply 0.5% spread to the forex rate (favorable to us)
      const exchangeRateWithSpread = this.applyForexSpread(baseForexRate.rate, false);
      
      // 5. Convert to user currency with spread applied
      const totalInUserCurrency = totalUsd * exchangeRateWithSpread;

      const response: QuantityToFiatQuoteResponse = {
        tokenSymbol: request.tokenSymbol.toUpperCase(),
        quantity: request.quantity,
        pricePerTokenUsd: cryptoPrice.priceInUsd,
        totalUsd,
        userCurrency: request.userCurrency.toUpperCase(),
        exchangeRate: exchangeRateWithSpread,
        totalInUserCurrency: Math.round(totalInUserCurrency * 100) / 100, // Round to 2 decimal places
        estimatedAt: new Date()
      };

      logger.info('Quantity-to-fiat quote generated', {
        tokenSymbol: request.tokenSymbol,
        quantity: request.quantity,
        totalInUserCurrency: response.totalInUserCurrency,
        userCurrency: request.userCurrency
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate quantity-to-fiat quote', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getFiatToQuantityQuote(request: FiatToQuantityQuoteRequest): Promise<FiatToQuantityQuoteResponse> {
    try {
      // 1. Get exchange rate from user currency to USD
      const baseForexRate = await this.getForexRate(request.userCurrency, 'USD');
      
      // 2. Apply 0.5% spread to the forex rate (favorable to us - user gets less USD)
      const exchangeRateWithSpread = this.applyForexSpread(baseForexRate.rate, true);
      
      // 3. Convert fiat amount to USD with spread applied
      const fiatAmountUsd = request.fiatAmount * exchangeRateWithSpread;
      
      // 4. Get current crypto price in USD
      const cryptoPrice = await this.getCryptoPrice(request.tokenSymbol);
      
      // 5. Calculate quantity user will receive (all of the USD amount goes to crypto)
      const quantity = fiatAmountUsd / cryptoPrice.priceInUsd;

      const response: FiatToQuantityQuoteResponse = {
        tokenSymbol: request.tokenSymbol.toUpperCase(),
        fiatAmount: request.fiatAmount,
        userCurrency: request.userCurrency.toUpperCase(),
        exchangeRate: exchangeRateWithSpread,
        fiatAmountUsd: Math.round(fiatAmountUsd * 100) / 100,
        pricePerTokenUsd: cryptoPrice.priceInUsd,
        quantity: Math.round(quantity * 100000000) / 100000000, // Round to 8 decimal places
        estimatedAt: new Date()
      };

      logger.info('Fiat-to-quantity quote generated', {
        tokenSymbol: request.tokenSymbol,
        fiatAmount: request.fiatAmount,
        quantity: response.quantity,
        userCurrency: request.userCurrency
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate fiat-to-quantity quote', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getSellQuantityToFiatQuote(request: SellQuantityToFiatQuoteRequest, userId: string): Promise<SellQuantityToFiatQuoteResponse> {
    try {
      // 1. Get current crypto price in USD
      const cryptoPrice = await this.getCryptoPrice(request.tokenSymbol);
      
      // 2. Calculate total USD value
      const totalUsd = request.quantity * cryptoPrice.priceInUsd;
      
      // 3. Get exchange rate from USD to user currency
      const baseForexRate = await this.getForexRate('USD', request.userCurrency);
      
      // 4. Apply 0.5% spread to the forex rate (less favorable for selling)
      const exchangeRateWithSpread = this.applyForexSpread(baseForexRate.rate, false);
      
      // 5. Convert to user currency with spread applied
      const totalInUserCurrency = totalUsd * exchangeRateWithSpread;
      
      // 6. Calculate platform fee (1% for selling)
      const platformFee = totalInUserCurrency * 0.01;
      const netAmountToUser = totalInUserCurrency - platformFee;
      
      // 7. Generate quote ID and expiry
      const quoteId = this.generateQuoteId();
      const estimatedAt = new Date();
      const expiresAt = new Date(Date.now() + this.QUOTE_DURATION);

      const response: SellQuantityToFiatQuoteResponse = {
        quoteId,
        tokenSymbol: request.tokenSymbol.toUpperCase(),
        quantity: request.quantity,
        pricePerTokenUsd: cryptoPrice.priceInUsd,
        totalUsd,
        userCurrency: request.userCurrency.toUpperCase(),
        exchangeRate: exchangeRateWithSpread,
        totalInUserCurrency: Math.round(totalInUserCurrency * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        netAmountToUser: Math.round(netAmountToUser * 100) / 100,
        estimatedAt,
        expiresAt
      };

      // 8. Store the quote for later use
      const storedQuote: StoredQuote = {
        quoteId,
        userId,
        quoteType: 'sell-quantity-to-fiat',
        tokenSymbol: request.tokenSymbol.toUpperCase(),
        quantity: request.quantity,
        fiatAmount: netAmountToUser,
        userCurrency: request.userCurrency.toUpperCase(),
        exchangeRate: exchangeRateWithSpread,
        pricePerTokenUsd: cryptoPrice.priceInUsd,
        platformFee,
        netAmountToUser,
        estimatedAt,
        expiresAt
      };
      
      await this.storeQuote(storedQuote);

      logger.info('Sell quantity-to-fiat quote generated', {
        quoteId,
        userId,
        tokenSymbol: request.tokenSymbol,
        quantity: request.quantity,
        netAmountToUser,
        userCurrency: request.userCurrency
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate sell quantity-to-fiat quote', {
        request,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getSellFiatToQuantityQuote(request: SellFiatToQuantityQuoteRequest, userId: string): Promise<SellFiatToQuantityQuoteResponse> {
    try {
      // 1. Get exchange rate from USD to user currency
      const baseForexRate = await this.getForexRate('USD', request.userCurrency);
      
      // 2. Apply 0.5% spread to the forex rate (less favorable for selling)
      const exchangeRateWithSpread = this.applyForexSpread(baseForexRate.rate, false);
      
      // 3. Calculate platform fee (1% for selling) - user wants to receive fiatAmount after fees
      const platformFeeRate = 0.01;
      const totalBeforeFee = request.fiatAmount / (1 - platformFeeRate);
      const platformFee = totalBeforeFee - request.fiatAmount;
      
      // 4. Convert total (including fee) to USD
      const fiatAmountUsd = totalBeforeFee / exchangeRateWithSpread;
      
      // 5. Get current crypto price in USD
      const cryptoPrice = await this.getCryptoPrice(request.tokenSymbol);
      
      // 6. Calculate quantity user needs to sell
      const quantity = fiatAmountUsd / cryptoPrice.priceInUsd;
      
      // 7. Generate quote ID and expiry
      const quoteId = this.generateQuoteId();
      const estimatedAt = new Date();
      const expiresAt = new Date(Date.now() + this.QUOTE_DURATION);

      const response: SellFiatToQuantityQuoteResponse = {
        quoteId,
        tokenSymbol: request.tokenSymbol.toUpperCase(),
        fiatAmount: request.fiatAmount,
        userCurrency: request.userCurrency.toUpperCase(),
        exchangeRate: exchangeRateWithSpread,
        fiatAmountUsd: Math.round(fiatAmountUsd * 100) / 100,
        pricePerTokenUsd: cryptoPrice.priceInUsd,
        quantity: Math.round(quantity * 100000000) / 100000000, // Round to 8 decimal places
        platformFee: Math.round(platformFee * 100) / 100,
        totalQuantityToSell: Math.round(quantity * 100000000) / 100000000,
        estimatedAt,
        expiresAt
      };

      // 8. Store the quote for later use
      const storedQuote: StoredQuote = {
        quoteId,
        userId,
        quoteType: 'sell-fiat-to-quantity',
        tokenSymbol: request.tokenSymbol.toUpperCase(),
        quantity,
        fiatAmount: request.fiatAmount,
        userCurrency: request.userCurrency.toUpperCase(),
        exchangeRate: exchangeRateWithSpread,
        pricePerTokenUsd: cryptoPrice.priceInUsd,
        platformFee,
        netAmountToUser: request.fiatAmount,
        estimatedAt,
        expiresAt
      };
      
      await this.storeQuote(storedQuote);

      logger.info('Sell fiat-to-quantity quote generated', {
        quoteId,
        userId,
        tokenSymbol: request.tokenSymbol,
        fiatAmount: request.fiatAmount,
        quantity,
        userCurrency: request.userCurrency
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate sell fiat-to-quantity quote', {
        request,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async storeQuote(quote: StoredQuote): Promise<void> {
    this.quoteStorage.set(quote.quoteId, quote);
    
    logger.debug('Quote stored', {
      quoteId: quote.quoteId,
      userId: quote.userId,
      expiresAt: quote.expiresAt
    });
  }

  async getStoredQuote(quoteId: string, userId: string): Promise<StoredQuote | null> {
    const quote = this.quoteStorage.get(quoteId);
    
    if (!quote) {
      return null;
    }
    
    // Check if quote belongs to the user
    if (quote.userId !== userId) {
      logger.warn('Quote access attempt by different user', {
        quoteId,
        requestedBy: userId,
        ownedBy: quote.userId
      });
      return null;
    }
    
    // Check if quote has expired
    if (Date.now() > quote.expiresAt.getTime()) {
      logger.info('Quote expired', {
        quoteId,
        userId,
        expiresAt: quote.expiresAt
      });
      this.quoteStorage.delete(quoteId);
      return null;
    }
    
    return quote;
  }

  async cleanupExpiredQuotes(): Promise<void> {
    const now = Date.now();
    const expiredQuotes: string[] = [];
    
    for (const [quoteId, quote] of this.quoteStorage.entries()) {
      if (now > quote.expiresAt.getTime()) {
        expiredQuotes.push(quoteId);
      }
    }
    
    for (const quoteId of expiredQuotes) {
      this.quoteStorage.delete(quoteId);
    }
    
    if (expiredQuotes.length > 0) {
      logger.info('Cleaned up expired quotes', {
        count: expiredQuotes.length,
        quoteIds: expiredQuotes
      });
    }
  }

  private generateQuoteId(): string {
    return `sell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Test both APIs with simple requests
      await Promise.all([
        this.getCryptoPrice('BTC'),
        this.getForexRate('USD', 'KES')
      ]);
      return true;
    } catch (error) {
      logger.error('Crypto quote service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}
