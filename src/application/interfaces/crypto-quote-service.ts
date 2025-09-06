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
  platformFeeUsd: number;
  totalWithFeeUsd: number;
  userCurrency: string;
  exchangeRate: number; // USD to user currency
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
  exchangeRate: number; // USD to user currency
  fiatAmountUsd: number;
  pricePerTokenUsd: number;
  platformFeeUsd: number;
  availableForPurchaseUsd: number; // fiatAmountUsd - platformFeeUsd
  quantity: number;
  estimatedAt: Date;
}

export interface CryptoQuoteService {
  // Get current crypto price in USD
  getCryptoPrice(tokenSymbol: string): Promise<CryptoPrice>;
  
  // Get forex exchange rate
  getForexRate(fromCurrency: string, toCurrency: string): Promise<ForexRate>;
  
  // Calculate platform fee in USD
  calculatePlatformFee(amountUsd: number): number;
  
  // Quote: User specifies quantity, get fiat cost
  getQuantityToFiatQuote(request: QuantityToFiatQuoteRequest): Promise<QuantityToFiatQuoteResponse>;
  
  // Quote: User specifies fiat amount, get crypto quantity
  getFiatToQuantityQuote(request: FiatToQuantityQuoteRequest): Promise<FiatToQuantityQuoteResponse>;
  
  // Health check
  isHealthy(): Promise<boolean>;
}
