/**
 * Callback Formatter Utility Classes
 * Handles conversion between different callback payload formats
 */

export interface BaseCallbackData {
  [key: string]: any;
}

export interface MpesaCallbackData extends BaseCallbackData {
  CheckoutRequestID?: string;
  MerchantRequestID?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  Amount?: number;
  MpesaReceiptNumber?: string;
  TransactionDate?: string;
  PhoneNumber?: string;
}

export interface MpesaStkCallbackData extends BaseCallbackData {
  Body?: {
    stkCallback?: {
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      ResultCode?: string | number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<{
          Name: string;
          Value: any;
        }>;
      };
    };
  };
}

export interface ProcessedCallbackData {
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: string;
  resultDesc: string;
  amount: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

/**
 * Base class for callback formatters
 */
export abstract class BaseCallbackFormatter {
  protected rawData: BaseCallbackData;

  constructor(data: BaseCallbackData) {
    this.rawData = data;
  }

  abstract extractFields(): ProcessedCallbackData;
  abstract validate(): boolean;

  protected extractFromCallbackMetadata(metadata: any, fieldName: string): any {
    if (!metadata?.Item || !Array.isArray(metadata.Item)) {
      return undefined;
    }

    const item = metadata.Item.find((item: any) => item.Name === fieldName);
    return item?.Value;
  }

  protected convertToCamelCase(pascalCase: string): string {
    return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
  }

  protected normalizeResultCode(resultCode: string | number): string {
    return String(resultCode);
  }
}

/**
 * Formatter for standard M-Pesa callbacks (direct format)
 */
export class MpesaCallbackFormatter extends BaseCallbackFormatter {
  constructor(data: MpesaCallbackData) {
    super(data);
  }

  extractFields(): ProcessedCallbackData {
    const data = this.rawData as MpesaCallbackData;
    
    // Handle multiple field name variations
    const checkoutRequestId = data['CheckoutRequestID'] || data['checkoutRequestID'] || data['checkoutRequestId'] || '';
    const merchantRequestId = data['MerchantRequestID'] || data['merchantRequestID'] || data['merchantRequestId'] || '';
    const resultCode = this.normalizeResultCode(data['ResultCode'] ?? data['resultCode'] ?? '');
    const resultDesc = data['ResultDesc'] || data['resultDesc'] || '';
    const amount = data['Amount'] || data['amount'] || 0;
    
    const result: ProcessedCallbackData = {
      checkoutRequestId,
      merchantRequestId,
      resultCode,
      resultDesc,
      amount
    };

    const mpesaReceiptNumber = data['MpesaReceiptNumber'] || data['mpesaReceiptNumber'];
    const transactionDate = data['TransactionDate'] || data['transactionDate'];
    const phoneNumber = data['PhoneNumber'] || data['phoneNumber'];

    if (mpesaReceiptNumber) {
      result.mpesaReceiptNumber = mpesaReceiptNumber;
    }
    if (transactionDate) {
      result.transactionDate = transactionDate;
    }
    if (phoneNumber) {
      result.phoneNumber = phoneNumber;
    }

    return result;
  }

  validate(): boolean {
    const data = this.rawData as MpesaCallbackData;
    
    // Check for required fields with multiple name variations
    const hasCheckoutRequestId = !!(data['CheckoutRequestID'] || data['checkoutRequestID'] || data['checkoutRequestId']);
    const hasMerchantRequestId = !!(data['MerchantRequestID'] || data['merchantRequestID'] || data['merchantRequestId']);
    const hasResultCode = data['ResultCode'] !== undefined || data['resultCode'] !== undefined;
    
    // At least one of the required fields should be present
    return hasCheckoutRequestId || hasMerchantRequestId || hasResultCode;
  }
}

/**
 * Formatter for M-Pesa STK callbacks (nested format)
 */
export class MpesaStkCallbackFormatter extends BaseCallbackFormatter {
  constructor(data: MpesaStkCallbackData) {
    super(data);
  }

  extractFields(): ProcessedCallbackData {
    const data = this.rawData as MpesaStkCallbackData;
    const stkCallback = data.Body?.stkCallback;
    
    if (!stkCallback) {
      throw new Error('STK callback data not found in expected structure');
    }

    // Extract from CallbackMetadata if available
    const metadata = stkCallback.CallbackMetadata;
    const amount = this.extractFromCallbackMetadata(metadata, 'Amount');
    const mpesaReceiptNumber = this.extractFromCallbackMetadata(metadata, 'MpesaReceiptNumber');
    const transactionDate = this.extractFromCallbackMetadata(metadata, 'TransactionDate');
    const phoneNumber = this.extractFromCallbackMetadata(metadata, 'PhoneNumber');

    const result: ProcessedCallbackData = {
      checkoutRequestId: stkCallback.CheckoutRequestID || '',
      merchantRequestId: stkCallback.MerchantRequestID || '',
      resultCode: this.normalizeResultCode(stkCallback.ResultCode ?? ''),
      resultDesc: stkCallback.ResultDesc || '',
      amount: amount || 0
    };

    if (mpesaReceiptNumber) {
      result.mpesaReceiptNumber = mpesaReceiptNumber;
    }
    if (transactionDate) {
      result.transactionDate = transactionDate;
    }
    if (phoneNumber) {
      result.phoneNumber = phoneNumber;
    }

    return result;
  }

  validate(): boolean {
    const data = this.rawData as MpesaStkCallbackData;
    const stkCallback = data.Body?.stkCallback;
    return !!(stkCallback?.CheckoutRequestID && stkCallback?.MerchantRequestID && stkCallback?.ResultCode !== undefined);
  }
}

/**
 * Factory class to determine and create the appropriate formatter
 */
export class CallbackFormatterFactory {
  static createFormatter(data: BaseCallbackData): BaseCallbackFormatter {
    // Check if it's an STK callback (nested structure)
    if (data['Body']?.stkCallback) {
      return new MpesaStkCallbackFormatter(data as MpesaStkCallbackData);
    }
    
    // Check if it's a standard M-Pesa callback (direct structure) - support multiple field name variations
    const hasCheckoutRequestId = data['CheckoutRequestID'] || data['checkoutRequestID'] || data['checkoutRequestId'];
    const hasMerchantRequestId = data['MerchantRequestID'] || data['merchantRequestID'] || data['merchantRequestId'];
    const hasResultCode = data['ResultCode'] !== undefined || data['resultCode'] !== undefined;
    
    if (hasCheckoutRequestId || hasMerchantRequestId || hasResultCode) {
      return new MpesaCallbackFormatter(data as MpesaCallbackData);
    }
    
    throw new Error('Unknown callback format');
  }
}

/**
 * Main utility function for processing callbacks
 */
export function processCallbackData(data: BaseCallbackData): ProcessedCallbackData {
  const formatter = CallbackFormatterFactory.createFormatter(data);
  
  if (!formatter.validate()) {
    throw new Error('Invalid callback data format');
  }
  
  return formatter.extractFields();
}

/**
 * Utility function to detect callback type
 */
export function detectCallbackType(data: BaseCallbackData): 'stk' | 'standard' | 'unknown' {
  if (data['Body']?.stkCallback) {
    return 'stk';
  }
  
  // Check for standard callback with multiple field name variations
  const hasCheckoutRequestId = data['CheckoutRequestID'] || data['checkoutRequestID'] || data['checkoutRequestId'];
  const hasMerchantRequestId = data['MerchantRequestID'] || data['merchantRequestID'] || data['merchantRequestId'];
  const hasResultCode = data['ResultCode'] !== undefined || data['resultCode'] !== undefined;
  
  if (hasCheckoutRequestId || hasMerchantRequestId || hasResultCode) {
    return 'standard';
  }
  
  return 'unknown';
} 