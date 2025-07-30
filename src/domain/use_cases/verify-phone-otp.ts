/**
 * Verify Phone OTP Use Case
 * Verifies OTP and marks phone as verified
 */

import { UserRepository } from '../repositories/user-repository';
import { VaultService } from '../../application/interfaces/vault-service';
import logger from '../../shared/logging';

export interface VerifyPhoneOTPRequest {
  userId: string;
  otp: string;
}

export interface VerifyPhoneOTPResponse {
  success: boolean;
  message: string;
}

export interface VerifyPhoneOTPResult {
  success: boolean;
  data?: VerifyPhoneOTPResponse;
  error?: string;
}

export class VerifyPhoneOTPUseCase {
  constructor(
    private userRepository: UserRepository,
    private vaultService: VaultService
  ) {}

  async execute(request: VerifyPhoneOTPRequest): Promise<VerifyPhoneOTPResult> {
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

      // 3. Get stored OTP from Vault
      const storedToken = await this.vaultService.getVerificationToken(request.userId, 'sms');
      if (!storedToken) {
        return {
          success: false,
          error: 'No OTP found. Please request a new OTP',
        };
      }

      const tokenData = JSON.parse(storedToken);
      const { otp, expiresAt, attempts } = tokenData;

      // 4. Check if OTP is expired
      if (new Date() > new Date(expiresAt)) {
        await this.vaultService.deleteVerificationToken(request.userId, 'sms');
        return {
          success: false,
          error: 'OTP has expired. Please request a new OTP',
        };
      }

      // 5. Check attempt limit
      if (attempts >= 3) {
        await this.vaultService.deleteVerificationToken(request.userId, 'sms');
        return {
          success: false,
          error: 'Too many failed attempts. Please request a new OTP',
        };
      }

      // 6. Verify OTP
      if (request.otp !== otp) {
        // Increment attempts
        tokenData.attempts = attempts + 1;
        await this.vaultService.storeVerificationToken(
          request.userId,
          'sms',
          JSON.stringify(tokenData)
        );

        return {
          success: false,
          error: 'Invalid OTP',
        };
      }

      // 7. Mark phone as verified
      user.verifyPhone();
      await this.userRepository.update(user);

      // 8. Clean up OTP
      await this.vaultService.deleteVerificationToken(request.userId, 'sms');

      logger.info('Phone OTP verified successfully', { 
        userId: request.userId,
        phone: user.phone 
      });

      return {
        success: true,
        data: {
          success: true,
          message: 'Phone number verified successfully',
        },
      };
    } catch (error) {
      logger.error('Verify phone OTP use case error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId 
      });
      
      return {
        success: false,
        error: 'Failed to verify OTP',
      };
    }
  }

  private validateRequest(request: VerifyPhoneOTPRequest): void {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
    if (!request.otp || request.otp.trim().length === 0) {
      throw new Error('OTP is required');
    }
    if (!/^\d{6}$/.test(request.otp)) {
      throw new Error('OTP must be 6 digits');
    }
  }
} 