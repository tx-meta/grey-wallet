/**
 * Payment Service Interface
 * Defines the contract for payment processing operations
 */

export interface MpesaPaymentRequest {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}

export interface MpesaPaymentResponse {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  error?: string;
}

export interface ExchangeRateRequest {
  fromCurrency: string;
  toCurrency: string;
}

export interface PaymentService {
  // M-Pesa integration
  initiateMpesaPayment(request: MpesaPaymentRequest): Promise<MpesaPaymentResponse>;
  verifyMpesaPayment(checkoutRequestId: string): Promise<{ success: boolean; status: string; error?: string }>;
  
  // Exchange rates
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number>;
  
  // Health check
  isHealthy(): Promise<boolean>;
} 