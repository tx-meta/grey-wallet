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

// Sell crypto quote interfaces
export interface SellQuantityToFiatQuoteRequest {
  tokenSymbol: string;
  quantity: number;
  userCurrency: string; // User's local currency (e.g., 'KES')
}

export interface SellQuantityToFiatQuoteResponse {
  quoteId: string; // Unique ID for this quote
  tokenSymbol: string;
  quantity: number;
  pricePerTokenUsd: number;
  totalUsd: number;
  userCurrency: string;
  exchangeRate: number; // USD to user currency (with spread applied - less favorable for user)
  totalInUserCurrency: number;
  platformFee: number; // Fee deducted from total
  netAmountToUser: number; // Amount user will receive after fees
  estimatedAt: Date;
  expiresAt: Date; // Quote expiration time
}

export interface SellFiatToQuantityQuoteRequest {
  tokenSymbol: string;
  fiatAmount: number; // Amount user wants to receive
  userCurrency: string;
}

export interface SellFiatToQuantityQuoteResponse {
  quoteId: string; // Unique ID for this quote
  tokenSymbol: string;
  fiatAmount: number; // Amount user will receive
  userCurrency: string;
  exchangeRate: number; // USD to user currency (with spread applied)
  fiatAmountUsd: number;
  pricePerTokenUsd: number;
  quantity: number; // Quantity user needs to sell
  platformFee: number;
  totalQuantityToSell: number; // Quantity + additional for fees
  estimatedAt: Date;
  expiresAt: Date;
}

export interface StoredQuote {
  quoteId: string;
  userId: string;
  quoteType: 'sell-quantity-to-fiat' | 'sell-fiat-to-quantity';
  tokenSymbol: string;
  quantity: number;
  fiatAmount: number;
  userCurrency: string;
  exchangeRate: number;
  pricePerTokenUsd: number;
  platformFee: number;
  netAmountToUser: number;
  estimatedAt: Date;
  expiresAt: Date;
}

export interface CryptoQuoteService {
  // Get current crypto price in USD
  getCryptoPrice(tokenSymbol: string): Promise<CryptoPrice>;
  
  // Get forex exchange rate
  getForexRate(fromCurrency: string, toCurrency: string): Promise<ForexRate>;
  
  // Apply spread to forex rate (0.5% spread for our profit margin)
  applyForexSpread(rate: number, isUserCurrencyToUsd: boolean): number;
  
  // BUY Quote: User specifies quantity, get fiat cost
  getQuantityToFiatQuote(request: QuantityToFiatQuoteRequest): Promise<QuantityToFiatQuoteResponse>;
  
  // BUY Quote: User specifies fiat amount, get crypto quantity
  getFiatToQuantityQuote(request: FiatToQuantityQuoteRequest): Promise<FiatToQuantityQuoteResponse>;
  
  // SELL Quote: User specifies quantity to sell, get fiat amount they'll receive
  getSellQuantityToFiatQuote(request: SellQuantityToFiatQuoteRequest, userId: string): Promise<SellQuantityToFiatQuoteResponse>;
  
  // SELL Quote: User specifies fiat amount they want, get crypto quantity needed
  getSellFiatToQuantityQuote(request: SellFiatToQuantityQuoteRequest, userId: string): Promise<SellFiatToQuantityQuoteResponse>;
  
  // Quote storage management
  storeQuote(quote: StoredQuote): Promise<void>;
  getStoredQuote(quoteId: string, userId: string): Promise<StoredQuote | null>;
  cleanupExpiredQuotes(): Promise<void>;
  
  // Health check
  isHealthy(): Promise<boolean>;
}
