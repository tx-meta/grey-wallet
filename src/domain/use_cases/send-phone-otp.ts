/**
 * Send Phone OTP Use Case
 * Generates and sends OTP for phone verification
 */

import { UserRepository } from '../repositories/user-repository';
import { VaultService } from '../../application/interfaces/vault-service';
import { NotificationService } from '../../application/interfaces/notification-service';
import logger from '../../shared/logging';

export interface SendPhoneOTPRequest {
  userId: string;
}

export interface SendPhoneOTPResponse {
  success: boolean;
  message: string;
  expiresIn: number; // seconds
}

export interface SendPhoneOTPResult {
  success: boolean;
  data?: SendPhoneOTPResponse;
  error?: string;
}

export class SendPhoneOTPUseCase {
  constructor(
    private userRepository: UserRepository,
    private vaultService: VaultService,
    private notificationService: NotificationService
  ) {}

  async execute(request: SendPhoneOTPRequest): Promise<SendPhoneOTPResult> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Get user details
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (user.isPhoneVerified) {
        return {
          success: false,
          error: 'Phone number already verified',
        };
      }

      // 3. Generate OTP
      const otp = this.generateOTP();
      const expiresIn = 300; // 5 minutes
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // 4. Store OTP in Vault
      await this.vaultService.storeVerificationToken(
        request.userId,
        'sms',
        JSON.stringify({
          otp,
          expiresAt: expiresAt.toISOString(),
          attempts: 0
        })
      );

      // 5. Send SMS
      const smsResult = await this.notificationService.sendSMSOTP(
        user.phone,
        otp,
        expiresIn
      );

      if (!smsResult.success) {
        logger.error('Failed to send SMS OTP', { 
          userId: request.userId,
          phone: user.phone,
          error: smsResult.error 
        });
        return {
          success: false,
          error: 'Failed to send OTP',
        };
      }

      logger.info('Phone OTP sent successfully', { 
        userId: request.userId,
        phone: user.phone 
      });

      return {
        success: true,
        data: {
          success: true,
          message: 'OTP sent successfully',
          expiresIn,
        },
      };
    } catch (error) {
      logger.error('Send phone OTP use case error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId 
      });
      
      return {
        success: false,
        error: 'Failed to send OTP',
      };
    }
  }

  private validateRequest(request: SendPhoneOTPRequest): void {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
} 