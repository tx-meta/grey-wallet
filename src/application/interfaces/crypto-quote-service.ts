/**
 * Crypto Quote Service Interface
 * Defines the contract for crypto price quotation operations
 */

export interface CryptoPrice {
  symbol: string;
  priceInUsd: number;
  lastUpdated: Date;
}

export interface ForexRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
}

export interface QuantityToFiatQuoteRequest {
  tokenSymbol: string;
  quantity: number;
  userCurrency: string; // User's local currency (e.g., 'KES')
}

export interface QuantityToFiatQuoteResponse {
  tokenSymbol: string;
  quantity: number;
  pricePerTokenUsd: number;
  totalUsd: number;
  userCurrency: string;
  exchangeRate: number; // USD to user currency (with 0.5% spread applied)
  totalInUserCurrency: number;
  estimatedAt: Date;
}

export interface FiatToQuantityQuoteRequest {
  tokenSymbol: string;
  fiatAmount: number;
  userCurrency: string; // User's local currency (e.g., 'KES')
}

export interface FiatToQuantityQuoteResponse {
  tokenSymbol: string;
  fiatAmount: number;
  userCurrency: string;
  exchangeRate: number; // User currency to USD (with 0.5% spread applied)
  fiatAmountUsd: number;
  pricePerTokenUsd: number;
  quantity: number;
  estimatedAt: Date;
}

export interface CryptoQuoteService {
  // Get current crypto price in USD
  getCryptoPrice(tokenSymbol: string): Promise<CryptoPrice>;
  
  // Get forex exchange rate
  getForexRate(fromCurrency: string, toCurrency: string): Promise<ForexRate>;
  
  // Apply spread to forex rate (0.5% spread for our profit margin)
  applyForexSpread(rate: number, isUserCurrencyToUsd: boolean): number;
  
  // Quote: User specifies quantity, get fiat cost
  getQuantityToFiatQuote(request: QuantityToFiatQuoteRequest): Promise<QuantityToFiatQuoteResponse>;
  
  // Quote: User specifies fiat amount, get crypto quantity
  getFiatToQuantityQuote(request: FiatToQuantityQuoteRequest): Promise<FiatToQuantityQuoteResponse>;
  
  // Health check
  isHealthy(): Promise<boolean>;
}
