/**
 * Notification Service Interface
 * Defines the contract for email and SMS notification operations
 */

export interface NotificationService {
  // Email notifications
  sendEmailWelcome(email: string, userName: string): Promise<void>;
  sendEmailPasswordReset(email: string, token: string, userName: string): Promise<void>;
  sendEmailTransactionNotification(email: string, transactionDetails: any): Promise<void>;

  // SMS notifications
  sendSMSVerification(phone: string, token: string): Promise<void>;
  sendSMSTransactionNotification(phone: string, transactionDetails: any): Promise<void>;
  sendSMSWelcome(phone: string, userName: string): Promise<void>;
  sendSMSOTP(phone: string, otp: string, expiresIn: number): Promise<{ success: boolean; error?: string }>;

  // Health check
  isHealthy(): Promise<boolean>;
} 