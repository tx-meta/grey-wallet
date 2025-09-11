/**
 * M-Pesa Payment Service Implementation
 * Real M-Pesa integration using Safaricom Daraja API
 */

import { 
  PaymentService, 
  MpesaPaymentRequest, 
  MpesaPaymentResponse,
  MpesaPayoutRequest,
  MpesaPayoutResponse
} from '../../application/interfaces/payment-service';
import logger from '../../shared/logging';

interface DarajaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
}

export class MpesaPaymentService implements PaymentService {
  private readonly config: DarajaConfig;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      consumerKey: process.env['DARAJA_CONSUMER_KEY'] || '',
      consumerSecret: process.env['DARAJA_CONSUMER_SECRET'] || '',
      businessShortCode: process.env['DARAJA_BUSINESS_SHORTCODE'] || '',
      passkey: process.env['DARAJA_PASSKEY'] || '',
      environment: (process.env['DARAJA_ENVIRONMENT'] as 'sandbox' | 'production') || 'sandbox'
    };

    if (!this.config.consumerKey || !this.config.consumerSecret) {
      throw new Error('DARAJA_CONSUMER_KEY and DARAJA_CONSUMER_SECRET are required');
    }
  }

  async initiateMpesaPayment(request: MpesaPaymentRequest): Promise<MpesaPaymentResponse> {
    try {
      // 1. Get access token
      const token = await this.getAccessToken();
      if (!token) {
        return {
          success: false,
          error: 'Failed to get access token'
        };
      }

      // 2. Format phone number
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber);

      // 3. Generate timestamp and password
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      // 4. Prepare STK Push request
      const stkPushPayload = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount),
        PartyA: formattedPhone,
        PartyB: this.config.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: request.callbackUrl,
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc
      };

      // 5. Make STK Push request
      const baseUrl = this.config.environment === 'production' 
        ? 'https://api.safaricom.co.ke' 
        : 'https://sandbox.safaricom.co.ke';

      const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stkPushPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('M-Pesa STK Push failed', { 
          status: response.status, 
          error: errorText,
          phoneNumber: formattedPhone,
          amount: request.amount
        });
        return {
          success: false,
          error: `M-Pesa API error: ${response.status}`
        };
      }

      const result = await response.json() as {
        ResponseDescription: any;
        ResponseCode: string;
        CheckoutRequestID: string;
        MerchantRequestID: string;
      };
      
      if (result.ResponseCode === '0') {
        
        logger.info('M-Pesa STK Push initiated successfully', { 
          checkoutRequestId: result.CheckoutRequestID,
          merchantRequestId: result.MerchantRequestID,
          phoneNumber: formattedPhone,
          amount: request.amount
        });

        return {
          success: true,
          checkoutRequestId: result.CheckoutRequestID,
          merchantRequestId: result.MerchantRequestID
        };
      } else {
        
        logger.error('M-Pesa STK Push failed', { 
          resultCode: result.ResponseCode,
          resultDesc: result.ResponseDescription,
          phoneNumber: formattedPhone,
          amount: request.amount
        });

        return {
          success: false,
          error: result.ResponseDescription || 'STK Push failed'
        };
      }
    } catch (error) {
      logger.error('M-Pesa payment initiation error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        phoneNumber: request.phoneNumber,
        amount: request.amount
      });
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  async verifyMpesaPayment(checkoutRequestId: string): Promise<{ success: boolean; status: string; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return {
          success: false,
          status: 'failed',
          error: 'Failed to get access token'
        };
      }

      const baseUrl = this.config.environment === 'production' 
        ? 'https://api.safaricom.co.ke' 
        : 'https://sandbox.safaricom.co.ke';

      const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          BusinessShortCode: this.config.businessShortCode,
          CheckoutRequestID: checkoutRequestId,
          Timestamp: this.generateTimestamp(),
          Password: this.generatePassword(this.generateTimestamp())
        })
      });

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          error: `API error: ${response.status}`
        };
      }

      const result = await response.json() as { ResultCode: string; ResultDesc?: string };
      
      if (result.ResultCode === '0') {
        return {
          success: true,
          status: 'completed'
        };
      } else {
        return {
          success: false,
          status: 'failed',
          error: result.ResultDesc || 'Payment verification failed'
        };
      }
    } catch (error) {
      logger.error('M-Pesa payment verification error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        checkoutRequestId
      });
      return {
        success: false,
        status: 'failed',
        error: 'Network error'
      };
    }
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      // For now, use a simple rate. In production, integrate with a real exchange rate API
      const rates: Record<string, number> = {
        'BTC': 4500000, // 1 BTC = 4,500,000 KES
        'ETH': 280000,  // 1 ETH = 280,000 KES
        'ADA': 45,      // 1 ADA = 45 KES
        'SOL': 8500     // 1 SOL = 8,500 KES
      };

      const rate = rates[toCurrency];
      if (!rate) {
        throw new Error(`Unsupported currency: ${toCurrency}`);
      }

      return rate;
    } catch (error) {
      logger.error('Exchange rate error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fromCurrency,
        toCurrency
      });
      throw new Error('Failed to get exchange rate');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      return false;
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Return cached token if still valid
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const baseUrl = this.config.environment === 'production' 
        ? 'https://api.safaricom.co.ke' 
        : 'https://sandbox.safaricom.co.ke';

      const credentials = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');

      const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status}`);
      }

      const result = await response.json() as { access_token: string; expires_in: number };
      
      this.accessToken = result.access_token;
      this.tokenExpiry = now + (result.expires_in * 1000) - 60000; // Expire 1 minute early
      
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get M-Pesa access token', { error });
      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +, remove it
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    // If it starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    // If it doesn't start with country code, assume it's Kenyan
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private generatePassword(timestamp: string): string {
    const str = this.config.businessShortCode + this.config.passkey + timestamp;
    return Buffer.from(str).toString('base64');
  }

  async initiateMpesaPayout(request: MpesaPayoutRequest): Promise<MpesaPayoutResponse> {
    try {
      // For now, simulate M-Pesa B2C payout
      // In a real implementation, this would use the M-Pesa B2C API
      logger.info('Simulating M-Pesa payout', {
        amount: request.amount,
        phoneNumber: request.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        accountReference: request.accountReference
      });

      return {
        success: true,
        transactionId: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: `conv_${Date.now()}`,
        originatorConversationId: `orig_${Date.now()}`
      };
    } catch (error) {
      logger.error('M-Pesa payout failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phoneNumber: request.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        amount: request.amount
      });

      return {
        success: false,
        error: 'Failed to initiate M-Pesa payout'
      };
    }
  }

  async verifyMpesaPayout(transactionId: string): Promise<{ success: boolean; status: string; error?: string }> {
    try {
      // For now, simulate payout verification
      // In a real implementation, this would query the M-Pesa API for transaction status
      logger.info('Simulating M-Pesa payout verification', { transactionId });

      return {
        success: true,
        status: 'completed'
      };
    } catch (error) {
      logger.error('M-Pesa payout verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId
      });

      return {
        success: false,
        status: 'failed',
        error: 'Failed to verify M-Pesa payout'
      };
    }
  }
} 