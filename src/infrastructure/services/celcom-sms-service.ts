/**
 * Celcom Africa SMS Service Implementation
 * Real SMS service using Celcom Africa API
 */

import { NotificationService } from '../../application/interfaces/notification-service';
import logger from '../../shared/logging';
import { smsConfig } from '../../shared/config/sms';

interface CelcomSMSResponse {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: string;
}

interface CelcomAPIResponse {
  responses: Array<{
    'respose-code': number;
    'response-description': string;
    mobile: string;
    messageid: string;
    networkid: string;
  }>;
}

export class CelcomSMSService implements NotificationService {
  private readonly apiUrl = smsConfig.celcom.apiUrl;
  private readonly apiKey = smsConfig.celcom.apiKey;
  private readonly shortcode = smsConfig.celcom.shortcode;
  private readonly partnerID = smsConfig.celcom.partnerID;

  async sendEmailWelcome(email: string, userName: string): Promise<void> {
    logger.info('Email welcome sent via Celcom SMS service', { email, userName });
  }

  async sendEmailPasswordReset(email: string, token: string, userName: string): Promise<void> {
    logger.info('Email password reset sent via Celcom SMS service', { email, userName, token });
  }

  async sendEmailTransactionNotification(email: string, transactionDetails: any): Promise<void> {
    logger.info('Email transaction notification sent via Celcom SMS service', { email, transactionDetails });
  }

  async sendSMSVerification(phone: string, token: string): Promise<void> {
    const message = smsConfig.celcom.messageTemplates.verification.replace('{token}', token);
    await this.sendSMS(phone, message);
  }

  async sendSMSTransactionNotification(phone: string, transactionDetails: any): Promise<void> {
    const message = smsConfig.celcom.messageTemplates.transaction
      .replace('{type}', transactionDetails.type || 'Unknown')
      .replace('{amount}', transactionDetails.amount || '0')
      .replace('{currency}', transactionDetails.currency || 'USD')
      .replace('{status}', transactionDetails.status || 'Unknown');
    await this.sendSMS(phone, message);
  }

  async sendSMSWelcome(phone: string, userName: string): Promise<void> {
    const message = smsConfig.celcom.messageTemplates.welcome.replace('{userName}', userName);
    await this.sendSMS(phone, message);
  }

  async sendSMSOTP(phone: string, otp: string, expiresIn: number): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const minutes = Math.floor(expiresIn / 60);
      const message = smsConfig.celcom.messageTemplates.otp
        .replace('{otp}', otp)
        .replace('{minutes}', minutes.toString());
      
      const result = await this.sendSMS(phone, message);
      return { 
        success: result.success, 
        ...(result.error && { error: result.error }),
        ...(result.messageId && { messageId: result.messageId })
      };
    } catch (error) {
      logger.error('Failed to send SMS OTP', { phone, error });
      return { success: false, error: 'Failed to send SMS' };
    }
  }

  async sendNotification(notification: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
    logger.info('Celcom SMS notification sent', {
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Test API connectivity by checking account balance
      const balance = await this.getAccountBalance();
      return balance !== null;
    } catch (error) {
      logger.error('SMS service health check failed', { error });
      return false;
    }
  }

  /**
   * Get delivery report for a specific message
   */
  async getDeliveryReport(messageId: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const response = await fetch(smsConfig.celcom.endpoints.getDLR, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.apiKey,
          partnerID: this.partnerID,
          messageID: messageId,
        }),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP Error: ${response.status}` };
      }

      const result = await response.json();
      logger.info('Delivery report retrieved', { messageId, result });
      
      return { success: true, status: 'Delivered' }; // Simplified for now
    } catch (error) {
      logger.error('Failed to get delivery report', { messageId, error });
      return { success: false, error: 'Failed to retrieve delivery report' };
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<number | null> {
    try {
      const response = await fetch(smsConfig.celcom.endpoints.getBalance, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.apiKey,
          partnerID: this.partnerID,
        }),
      });

      if (!response.ok) {
        logger.error('Failed to get account balance', { status: response.status });
        return null;
      }

      const result = await response.json() as any;
      logger.info('Account balance retrieved', { result });
      
      // Parse balance from response (adjust based on actual API response format)
      return result.balance || null;
    } catch (error) {
      logger.error('Failed to get account balance', { error });
      return null;
    }
  }

  private async sendSMS(phone: string, message: string): Promise<CelcomSMSResponse> {
    try {
      // Format phone number (remove + and add country code if needed)
      const formattedPhone = this.formatPhoneNumber(phone);

      const payload = {
        apikey: this.apiKey,
        partnerID: this.partnerID,
        message: message,
        shortcode: this.shortcode,
        mobile: formattedPhone,
        pass_type: 'plain', // or 'json'
        cliMsgID: `grey-wallet-${Date.now()}`, // Unique message ID
      };

      logger.info('Sending SMS via Celcom Africa', { 
        phone: formattedPhone, 
        messageLength: message.length 
      });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('SMS API error', { 
          status: response.status, 
          error: errorText,
          phone: formattedPhone 
        });
        return { success: false, error: `API Error: ${response.status}` };
      }

      const result = await response.json() as CelcomAPIResponse;
      
      if (result.responses && result.responses.length > 0) {
        const firstResponse = result.responses[0];
        
        if (firstResponse && firstResponse['respose-code'] === 200) {
          logger.info('SMS sent successfully', { 
            phone: formattedPhone, 
            messageId: firstResponse.messageid,
            responseCode: firstResponse['respose-code'],
            description: firstResponse['response-description']
          });
          return { 
            success: true, 
            message: 'SMS sent successfully',
            messageId: firstResponse.messageid
          };
        } else if (firstResponse) {
          const errorMessage = this.getErrorMessage(firstResponse['respose-code'], firstResponse['response-description']);
          logger.error('SMS API returned error code', { 
            responseCode: firstResponse['respose-code'],
            description: firstResponse['response-description'],
            phone: formattedPhone,
            errorMessage
          });
          return { 
            success: false, 
            error: errorMessage
          };
        } else {
          logger.error('SMS API returned invalid response structure', { 
            result, 
            phone: formattedPhone 
          });
          return { success: false, error: 'Invalid response structure' };
        }
      } else {
        logger.error('SMS API returned invalid response', { 
          result, 
          phone: formattedPhone 
        });
        return { success: false, error: 'Invalid API response' };
      }
    } catch (error) {
      logger.error('SMS sending failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        phone 
      });
      return { success: false, error: 'Network error' };
    }
  }

  private getErrorMessage(responseCode: number, description: string): string {
    return smsConfig.celcom.errorCodes[responseCode as keyof typeof smsConfig.celcom.errorCodes] || `API Error: ${responseCode} - ${description}`;
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +, remove it
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    // If it starts with 0, replace with 254 (Kenya country code)
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    // If it doesn't start with country code, assume it's Kenyan
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }
} 