/**
 * Phone Verification Controller
 * Handles phone OTP verification requests
 */

import { Request, Response } from 'express';
import { SendPhoneOTPUseCase } from '../../domain/use_cases/send-phone-otp';
import { VerifyPhoneOTPUseCase } from '../../domain/use_cases/verify-phone-otp';
import logger from '../../shared/logging';

export class PhoneVerificationController {
  constructor(
    private sendPhoneOTPUseCase: SendPhoneOTPUseCase,
    private verifyPhoneOTPUseCase: VerifyPhoneOTPUseCase
  ) {}

  /**
   * POST /api/phone/send-otp
   * Send OTP to user's phone number
   */
  async sendOTP(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      logger.info('Send phone OTP request received', { userId });

      const result = await this.sendPhoneOTPUseCase.execute({ userId });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Phone OTP sent successfully', { userId });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Send phone OTP error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/phone/verify-otp
   * Verify OTP and mark phone as verified
   */
  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { otp } = req.body;

      if (!otp) {
        res.status(400).json({
          success: false,
          message: 'OTP is required',
        });
        return;
      }

      logger.info('Verify phone OTP request received', { userId });

      const result = await this.verifyPhoneOTPUseCase.execute({ userId, otp });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Phone OTP verified successfully', { userId });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Verify phone OTP error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
} 