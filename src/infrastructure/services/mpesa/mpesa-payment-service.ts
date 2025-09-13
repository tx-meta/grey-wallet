/**
 * M-Pesa Payment Service
 * Handles all M-Pesa API interactions including authentication and payment processing
 */

import { B2BPaymentRequest } from './models/b2b-payment-request';
import { B2CPaymentRequest } from './models/b2c-payment-request';
import { STKPushRequest } from './models/stk-push-request';
import config from '../../../shared/config';
import logger from '../../../shared/logging';
import dotenv from 'dotenv';

// Load environment variables as a fallback
dotenv.config();

export interface MpesaResponse {
  OriginatorConversationID?: string;
  MerchantRequestID?: string;
  ResponseCode: string;
  ResponseDescription: string;
  CheckoutRequestID?: string;
  CustomerMessage?: string;
}

export interface MpesaCallbackData {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

export class MpesaPaymentService {
  private static tokenExpiry = 0;
  private static apiToken = '';

  constructor() {
    const tokenUrl = config.mpesa?.tokenUrl || process.env['DARAJA_TOKEN_URL'];
    const consumerKey = config.mpesa?.consumerKey || process.env['DARAJA_CONSUMER_KEY'];
    const consumerSecret = config.mpesa?.consumerSecret || process.env['DARAJA_CONSUMER_SECRET'];
    
    if (!tokenUrl || !consumerKey || !consumerSecret) {
      throw new Error('M-Pesa credentials not configured. Please set DARAJA_TOKEN_URL, DARAJA_CONSUMER_KEY, and DARAJA_CONSUMER_SECRET');
    }
  }

  /**
   * Get access token from M-Pesa API
   */
  private async getAccessToken(): Promise<string> {
    const currentTime = Date.now();
    
    if (
      MpesaPaymentService.tokenExpiry === 0 ||
      MpesaPaymentService.apiToken === '' ||
      currentTime > MpesaPaymentService.tokenExpiry
    ) {
      try {
        const consumerKey = config.mpesa?.consumerKey || process.env['DARAJA_CONSUMER_KEY'] || '';
        const consumerSecret = config.mpesa?.consumerSecret || process.env['DARAJA_CONSUMER_SECRET'] || '';
        const tokenUrl = config.mpesa?.tokenUrl || process.env['DARAJA_TOKEN_URL'] || '';
        
        const credentials = Buffer.from(
          `${consumerKey}:${consumerSecret}`
        ).toString('base64');

        const response = await fetch(tokenUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { access_token: string; expires_in: number };
        MpesaPaymentService.apiToken = data.access_token;
        // Set expiry 100 seconds before M-Pesa API does it
        MpesaPaymentService.tokenExpiry = currentTime + (data.expires_in - 100) * 1000;

        logger.info('M-Pesa access token obtained successfully');
        return MpesaPaymentService.apiToken;
      } catch (error) {
        logger.error('Failed to get M-Pesa access token', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error(`Failed to get M-Pesa access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return MpesaPaymentService.apiToken;
  }

  /**
   * Generate timestamp for M-Pesa API
   */
  private generateTimestamp(): string {
    const date = new Date();
    return (
      date.getFullYear() +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      ('0' + date.getDate()).slice(-2) +
      ('0' + date.getHours()).slice(-2) +
      ('0' + date.getMinutes()).slice(-2) +
      ('0' + date.getSeconds()).slice(-2)
    );
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(timestamp: string): string {
    const shortCode = config.mpesa.shortCode;
    const passKey = config.mpesa.apiPassKey;
    return Buffer.from(shortCode + passKey + timestamp).toString('base64');
  }

  /**
   * Initiate STK Push payment (for buy crypto)
   */
  async initiateSTKPush(params: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<MpesaResponse> {
    try {
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      const accessToken = await this.getAccessToken();

      const stkPushRequest = new STKPushRequest({
        businessShortCode: config.mpesa.shortCode,
        password,
        timestamp,
        transactionType: 'CustomerPayBillOnline',
        amount: Math.floor(params.amount),
        partyA: params.phoneNumber,
        partyB: config.mpesa.stkPushPartyB,
        phoneNumber: params.phoneNumber,
        callBackURL: config.mpesa.stkPushResultUrl,
        accountReference: params.accountReference,
        transactionDesc: params.transactionDesc,
      });

      const response = await fetch(config.mpesa.stkPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(stkPushRequest.toPascalCase()),
      });

      if (!response.ok) {
        throw new Error(`STK Push request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as MpesaResponse;
      
      if (data.ResponseCode !== '0') {
        throw new Error(`STK Push failed: ${data.ResponseDescription}`);
      }

      logger.info('STK Push initiated successfully', {
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
        amount: params.amount,
        phoneNumber: params.phoneNumber.replace(/\d(?=\d{4})/g, '*')
      });

      return data;
    } catch (error) {
      logger.error('STK Push initiation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: {
          ...params,
          phoneNumber: params.phoneNumber.replace(/\d(?=\d{4})/g, '*')
        }
      });
      throw error;
    }
  }

  /**
   * Initiate B2C payment (for sell crypto - disbursement to user)
   */
  async initiateB2CPayment(params: {
    phoneNumber: string;
    amount: number;
    transactionId: string;
    remarks: string;
  }): Promise<MpesaResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const b2cRequest = new B2CPaymentRequest({
        amount: Math.floor(params.amount),
        partyA: Number.parseInt(config.mpesa.b2cShortCode),
        partyB: Number.parseInt(params.phoneNumber),
        originatorConversationID: params.transactionId,
        initiatorName: config.mpesa.b2cInitiatorName,
        securityCredential: config.mpesa.securityCredential,
        commandID: 'BusinessPayment',
        remarks: params.remarks,
        queueTimeOutURL: config.mpesa.b2cTimeoutUrl,
        resultURL: config.mpesa.b2cResultUrl,
        occasion: '',
      });

      const response = await fetch(config.mpesa.b2cUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(b2cRequest.toPascalCase()),
      });

      if (!response.ok) {
        throw new Error(`B2C payment request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as MpesaResponse;

      if (data.ResponseCode !== '0') {
        throw new Error(`B2C payment failed: ${data.ResponseDescription}`);
      }

      logger.info('B2C payment initiated successfully', {
        originatorConversationId: data.OriginatorConversationID,
        amount: params.amount,
        phoneNumber: params.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        transactionId: params.transactionId
      });

      return data;
    } catch (error) {
      logger.error('B2C payment initiation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: {
          ...params,
          phoneNumber: params.phoneNumber.replace(/\d(?=\d{4})/g, '*')
        }
      });
      throw error;
    }
  }

  /**
   * Initiate B2B payment (for business payments)
   */
  async initiateB2BPayment(params: {
    partyB: number;
    amount: number;
    accountReference: string; // Changed to string
    method: 'paybill' | 'buygoods' | 'pochi';
    remarks: string;
  }): Promise<MpesaResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const b2bRequest = new B2BPaymentRequest({
        amount: Math.floor(params.amount),
        partyB: params.partyB,
        accountReference: params.accountReference,
        method: params.method,
        remarks: params.remarks,
      });

      const b2bUrl = config.mpesa?.b2bUrl || process.env['DARAJA_B2B_API_URL'] || '';
      
      if (!b2bUrl) {
        throw new Error('MPESA B2B URL not configured');
      }

      const requestPayload = b2bRequest.toPascalCase();
      
      // Debug log the exact payload being sent to MPESA
      logger.debug('B2B MPESA request payload', {
        url: b2bUrl,
        payload: requestPayload
      });

      const response = await fetch(b2bUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('B2B MPESA API error response', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          requestPayload
        });
        throw new Error(`B2B payment request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as MpesaResponse;

      if (data.ResponseCode !== '0') {
        throw new Error(`B2B payment failed: ${data.ResponseDescription}`);
      }

      logger.info('B2B payment initiated successfully', {
        originatorConversationId: data.OriginatorConversationID,
        amount: params.amount,
        partyB: params.partyB,
        method: params.method
      });

      return data;
    } catch (error) {
      logger.error('B2B payment initiation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  /**
   * Process M-Pesa callback data
   */
  processCallback(callbackData: MpesaCallbackData): {
    success: boolean;
    transactionId?: string;
    amount?: number;
    phoneNumber?: string;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    error?: string;
  } {
    try {
      const { stkCallback } = callbackData.Body;
      
      if (stkCallback.ResultCode === 0) {
        // Payment successful
        const metadata = stkCallback.CallbackMetadata?.Item || [];
        const amountItem = metadata.find(item => item.Name === 'Amount');
        const phoneNumberItem = metadata.find(item => item.Name === 'PhoneNumber');
        const mpesaReceiptNumberItem = metadata.find(item => item.Name === 'MpesaReceiptNumber');
        const transactionDateItem = metadata.find(item => item.Name === 'TransactionDate');

        return {
          success: true,
          transactionId: stkCallback.CheckoutRequestID,
          amount: amountItem ? Number(amountItem.Value) : 0,
          phoneNumber: phoneNumberItem ? String(phoneNumberItem.Value) : '',
          mpesaReceiptNumber: mpesaReceiptNumberItem ? String(mpesaReceiptNumberItem.Value) : '',
          transactionDate: transactionDateItem ? String(transactionDateItem.Value) : '',
        };
      } else {
        // Payment failed
        return {
          success: false,
          error: stkCallback.ResultDesc,
        };
      }
    } catch (error) {
      logger.error('Failed to process M-Pesa callback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        callbackData
      });
      
      return {
        success: false,
        error: 'Failed to process callback data',
      };
    }
  }
}
