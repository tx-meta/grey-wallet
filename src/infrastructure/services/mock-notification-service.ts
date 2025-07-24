/**
 * Mock Notification Service Implementation
 * For testing purposes only
 */

import { NotificationService } from '../../application/interfaces/notification-service';
import logger from '../../../shared/logging';

export class MockNotificationService implements NotificationService {
  async sendEmailVerification(email: string, token: string, userName: string): Promise<void> {
    logger.info('Mock notification: email verification sent', { email, userName, token });
  }

  async sendEmailWelcome(email: string, userName: string): Promise<void> {
    logger.info('Mock notification: welcome email sent', { email, userName });
  }

  async sendEmailPasswordReset(email: string, token: string, userName: string): Promise<void> {
    logger.info('Mock notification: password reset email sent', { email, userName, token });
  }

  async sendEmailTransactionNotification(email: string, transactionDetails: any): Promise<void> {
    logger.info('Mock notification: transaction email sent', { email, transactionDetails });
  }

  async sendSMSVerification(phone: string, token: string): Promise<void> {
    logger.info('Mock notification: SMS verification sent', { phone, token });
  }

  async sendSMSTransactionNotification(phone: string, transactionDetails: any): Promise<void> {
    logger.info('Mock notification: transaction SMS sent', { phone, transactionDetails });
  }

  async sendSMSWelcome(phone: string, userName: string): Promise<void> {
    logger.info('Mock notification: welcome SMS sent', { phone, userName });
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
} 