/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

import { Request, Response } from 'express';
import { SignUpUseCase, SignUpRequest } from '../../domain/use_cases/sign-up';
import logger from '../../shared/logging';

export class AuthController {
  constructor(private signUpUseCase: SignUpUseCase) {}

  /**
   * POST /api/auth/signup
   * User registration endpoint
   */
  async signUp(req: Request, res: Response): Promise<void> {
    try {
      const signUpRequest: SignUpRequest = {
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        country: req.body.country,
        currency: req.body.currency,
      };

      logger.info('Sign up request received', { email: signUpRequest.email });

      const result = await this.signUpUseCase.execute(signUpRequest);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      // Don't send sensitive data in response
      const { user, wallet } = result.data!;
      const responseData = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          country: user.country,
          currency: user.currency,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
        },
        wallet: {
          walletId: wallet.walletId,
          walletBalance: wallet.walletBalance,
          createdAt: wallet.createdAt,
        },
        message: 'User registered successfully. Please check your email and phone for verification.',
      };

      logger.info('User registered successfully', { userId: user.id });

      res.status(201).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      logger.error('Sign up error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/verify-email
   * Email verification endpoint
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        res.status(400).json({
          success: false,
          message: 'User ID and token are required',
        });
        return;
      }

      // TODO: Implement email verification use case
      logger.info('Email verification request', { userId });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/verify-sms
   * SMS verification endpoint
   */
  async verifySMS(req: Request, res: Response): Promise<void> {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        res.status(400).json({
          success: false,
          message: 'User ID and token are required',
        });
        return;
      }

      // TODO: Implement SMS verification use case
      logger.info('SMS verification request', { userId });

      res.status(200).json({
        success: true,
        message: 'Phone number verified successfully',
      });
    } catch (error) {
      logger.error('SMS verification error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/login
   * User login endpoint
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      // TODO: Implement login use case
      logger.info('Login request', { email });

      res.status(200).json({
        success: true,
        message: 'Login endpoint - implementation pending',
      });
    } catch (error) {
      logger.error('Login error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
} 