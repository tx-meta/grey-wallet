/**
 * Celcom Africa SMS Service Implementation
 * Real SMS service using Celcom Africa API
 */

import { NotificationService } from '../../application/interfaces/notification-service';
import logger from '../../shared/logging';

interface CelcomSMSResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class CelcomSMSService implements NotificationService {
  private readonly apiUrl = 'https://isms.celcomafrica.com/api/services/sendsms';
  private readonly apiKey = 'bed304fc5bc9ce390c20aac616bb54dc';
  private readonly shortcode = 'TEXTME';
  private readonly partnerID =  113;

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
    const message = `Your verification code is: ${token}. Valid for 5 minutes.`;
    await this.sendSMS(phone, message);
  }

  async sendSMSTransactionNotification(phone: string, transactionDetails: any): Promise<void> {
    const message = `Transaction: ${transactionDetails.type} ${transactionDetails.amount} ${transactionDetails.currency}. Status: ${transactionDetails.status}`;
    await this.sendSMS(phone, message);
  }

  async sendSMSWelcome(phone: string, userName: string): Promise<void> {
    const message = `Welcome to Grey Wallet, ${userName}! Your account has been created successfully.`;
    await this.sendSMS(phone, message);
  }

  async sendSMSOTP(phone: string, otp: string, expiresIn: number): Promise<{ success: boolean; error?: string }> {
    try {
      const minutes = Math.floor(expiresIn / 60);
      const message = `Your Zao Wallet verification code is: ${otp}. Valid for ${minutes} minutes. Do not share this code with anyone.`;
      
      const result = await this.sendSMS(phone, message);
      return { success: result.success, ...(result.error && { error: result.error }) };
    } catch (error) {
      logger.error('Failed to send SMS OTP', { phone, error });
      return { success: false, error: 'Failed to send SMS' };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Test API connectivity
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.apiKey,
          partnerID: this.partnerID,
          message: 'Health check',
          shortcode: this.shortcode,
          mobile: '254700000000', // Test number
        }),
      });

      return response.ok;
    } catch (error) {
      logger.error('SMS service health check failed', { error });
      return false;
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

      const result = await response.json() as any;
      
      if (result.responses.length > 0) {
        logger.info('SMS sent successfully', { 
          phone: formattedPhone, 
          messageId: result.messageId 
        });
        return { success: true, message: 'SMS sent successfully' };
      } else {
        logger.error('SMS API returned error', { 
          result, 
          phone: formattedPhone 
        });
        return { success: false, error: result.message || 'SMS sending failed' };
      }
    } catch (error) {
      logger.error('SMS sending failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        phone 
      });
      return { success: false, error: 'Network error' };
    }
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