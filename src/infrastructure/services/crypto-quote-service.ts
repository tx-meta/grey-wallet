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
  FiatToQuantityQuoteResponse
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

  calculatePlatformFee(amountUsd: number): number {
    // Platform fee: 2% with minimum of $1 USD
    const feePercentage = 0.02; // 2%
    const minimumFee = 1; // $1 USD
    
    const calculatedFee = amountUsd * feePercentage;
    return Math.max(calculatedFee, minimumFee);
  }

  async getQuantityToFiatQuote(request: QuantityToFiatQuoteRequest): Promise<QuantityToFiatQuoteResponse> {
    try {
      // 1. Get current crypto price in USD
      const cryptoPrice = await this.getCryptoPrice(request.tokenSymbol);
      
      // 2. Calculate total USD before fees
      const totalUsd = request.quantity * cryptoPrice.priceInUsd;
      
      // 3. Calculate platform fee
      const platformFeeUsd = this.calculatePlatformFee(totalUsd);
      const totalWithFeeUsd = totalUsd + platformFeeUsd;
      
      // 4. Get exchange rate from USD to user currency
      const forexRate = await this.getForexRate('USD', request.userCurrency);
      
      // 5. Convert to user currency
      const totalInUserCurrency = totalWithFeeUsd * forexRate.rate;

      const response: QuantityToFiatQuoteResponse = {
        tokenSymbol: request.tokenSymbol.toUpperCase(),
        quantity: request.quantity,
        pricePerTokenUsd: cryptoPrice.priceInUsd,
        totalUsd,
        platformFeeUsd,
        totalWithFeeUsd,
        userCurrency: request.userCurrency.toUpperCase(),
        exchangeRate: forexRate.rate,
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
      const forexRate = await this.getForexRate(request.userCurrency, 'USD');
      
      // 2. Convert fiat amount to USD
      const fiatAmountUsd = request.fiatAmount * forexRate.rate;
      
      // 3. Calculate platform fee in USD
      const platformFeeUsd = this.calculatePlatformFee(fiatAmountUsd);
      
      // 4. Calculate available amount for purchase (after fee)
      const availableForPurchaseUsd = fiatAmountUsd - platformFeeUsd;
      
      if (availableForPurchaseUsd <= 0) {
        throw new Error('Amount too small - would be entirely consumed by platform fee');
      }
      
      // 5. Get current crypto price in USD
      const cryptoPrice = await this.getCryptoPrice(request.tokenSymbol);
      
      // 6. Calculate quantity user will receive
      const quantity = availableForPurchaseUsd / cryptoPrice.priceInUsd;

      const response: FiatToQuantityQuoteResponse = {
        tokenSymbol: request.tokenSymbol.toUpperCase(),
        fiatAmount: request.fiatAmount,
        userCurrency: request.userCurrency.toUpperCase(),
        exchangeRate: forexRate.rate,
        fiatAmountUsd: Math.round(fiatAmountUsd * 100) / 100,
        pricePerTokenUsd: cryptoPrice.priceInUsd,
        platformFeeUsd: Math.round(platformFeeUsd * 100) / 100,
        availableForPurchaseUsd: Math.round(availableForPurchaseUsd * 100) / 100,
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
