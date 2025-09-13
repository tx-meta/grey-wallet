/**
 * B2B Payment Service Interface
 * Defines the contract for B2B MPESA payment operations
 */

export interface B2BPaymentQuote {
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

export interface CreateB2BPaymentQuoteRequest {
  userId: string;
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
}

export interface InitiateB2BPaymentRequest {
  amount: number;
  recipientType: 'paybill' | 'till' | 'pochi';
  businessNumber: string;
  accountNumber?: string | undefined;
  transactionId: string;
  description: string;
}

export interface B2BPaymentResponse {
  ConversationID?: string | undefined;
  OriginatorConversationID?: string | undefined;
  ResponseCode?: string | undefined;
  ResponseDescription?: string | undefined;
}

/**
 * Service interface for handling B2B MPESA payments using crypto funds
 */
export interface B2BPaymentService {
  /**
   * Get current exchange rate between two currencies
   * @param fromCurrency Source currency (e.g., 'USDT')
   * @param toCurrency Target currency (e.g., 'KES')
   * @returns Exchange rate (1 unit of fromCurrency = X units of toCurrency)
   */
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number>;

  /**
   * Create and store a B2B payment quote
   * @param request Quote creation request
   * @returns Stored quote with expiration details
   */
  createB2BPaymentQuote(request: CreateB2BPaymentQuoteRequest): Promise<B2BPaymentQuote>;

  /**
   * Retrieve a stored quote by ID and user ID
   * @param quoteId Quote identifier
   * @param userId User identifier for security
   * @returns Stored quote or null if not found/expired
   */
  getStoredQuote(quoteId: string, userId: string): Promise<B2BPaymentQuote | null>;

  /**
   * Initiate a B2B MPESA payment
   * @param request Payment initiation request
   * @returns MPESA API response
   */
  initiateB2BPayment(request: InitiateB2BPaymentRequest): Promise<B2BPaymentResponse>;

  /**
   * Validate business number format
   * @param businessNumber Business number to validate
   * @param recipientType Type of recipient (paybill, till, pochi)
   * @returns True if valid, false otherwise
   */
  validateBusinessNumber(businessNumber: string, recipientType: string): boolean;

  /**
   * Validate account number format (for paybill payments)
   * @param accountNumber Account number to validate
   * @returns True if valid, false otherwise
   */
  validateAccountNumber(accountNumber: string): boolean;
}
